import { describe, expect, it } from 'vitest'
import type { ExerciseEntry, WeightEntry } from './models'
import { calculateActivityDay, calculateActivityWeek, estimateWorkout, netMetKcal, weekBounds, weightForDay } from './activity'

const timestamp = '2026-11-06T12:00:00.000Z'
const weight = (dayKey: string, weightKg: number): WeightEntry => ({
  id: `w-${dayKey}`, dayKey, weightKg, recordedAt: timestamp, createdAt: timestamp, updatedAt: timestamp
})
const exercise = (overrides: Partial<ExerciseEntry> = {}): ExerciseEntry => ({
  id: 'synthetic-workout', dayKey: '2026-11-06', startedAt: timestamp,
  activity: 'Walking', durationMinutes: 40, intensity: 'moderate',
  estimationMethod: 'metNet', estimatedEnergyKcal: null, met: 4, isStrengthTraining: false,
  createdAt: timestamp, updatedAt: timestamp,
  ...overrides
})

describe('exercise energy estimates', () => {
  it('subtracts the resting MET once; does not use gross MET × weight', () => {
    expect(netMetKcal(4, 70, 30)).toBeCloseTo(110.25)
    expect(netMetKcal(1, 70, 30)).toBe(0)
    expect(netMetKcal(0.5, 70, 30)).toBeNull()
    expect(netMetKcal(Number.NaN, 70, 30)).toBeNull()
  })
  it('uses only measurements recorded on or before the historical local day', () => {
    const entries = [weight('2026-11-03', 70), weight('2026-11-07', 80)]
    expect(weightForDay('2026-11-06', entries)).toMatchObject({
      source: 'carriedForward', sourceDay: '2026-11-03', weightKg: 70
    })
    expect(estimateWorkout(exercise(), entries, true).kcal).toBeCloseTo(147)
    expect(weightForDay('2026-11-02', entries).weightKg).toBeNull()
    expect(estimateWorkout(exercise(), [weight('2026-11-07', 80)], true).kcal).toBeNull()
  })
  it('does not choose between duplicate legacy measurements on the selected day', () => {
    expect(weightForDay('2026-11-06', [weight('2026-11-06', 70), { ...weight('2026-11-06', 80), id: 'duplicate' }]).source).toBe('ambiguous')
    expect(estimateWorkout(exercise(), [weight('2026-11-06', 70), { ...weight('2026-11-06', 80), id: 'duplicate' }], true).kcal).toBeNull()
  })
  it('uses manual ACTIVE values once even without a recorded weight', () => {
    const recorded = exercise({ estimationMethod: 'manualActive', estimatedEnergyKcal: 125, met: null })
    expect(estimateWorkout(recorded, [], true)).toMatchObject({ kcal: 125, method: 'manualActive', weight: null })
    const summary = calculateActivityDay('2026-11-06', [recorded], [], true)
    expect(summary.knownIncrementalKcal).toBe(125)
    expect(summary.knownEnergyEntries).toBe(1)
  })
  it('requires explicit adult applicability for manual and MET energy results', () => {
    const session = exercise({ estimationMethod: 'manualActive', estimatedEnergyKcal: 90, met: null })
    expect(estimateWorkout(session, [], false).kcal).toBeNull()
    expect(calculateActivityDay('2026-11-06', [session], [], false)).toMatchObject({
      entries: 1, loggedMinutes: 40, knownIncrementalKcal: null,
      unknownEnergyEntries: 1, energyCoverageComplete: false
    })
    expect(estimateWorkout(exercise(), [weight('2026-11-06', 70)], false).kcal).toBeNull()
  })
  it('preserves unknown exercise kcal and distinguishes partial coverage', () => {
    const manual = exercise({ estimationMethod: 'manualActive', estimatedEnergyKcal: 50, met: null })
    const unknown = exercise({ id: 'unknown', estimationMethod: 'unknown', met: null })
    const summary = calculateActivityDay('2026-11-06', [manual, unknown], [], true)
    expect(summary).toMatchObject({ entries: 2, loggedMinutes: 80, knownIncrementalKcal: 50, knownEnergyEntries: 1, unknownEnergyEntries: 1, energyCoverageComplete: false })
    expect(calculateActivityDay('2026-11-06', [], [], true)).toMatchObject({ entries: 0, loggedMinutes: null, knownIncrementalKcal: null })
  })
})

describe('local weekly activity', () => {
  it('uses Monday-Sunday across month boundaries and leap dates', () => {
    expect(weekBounds('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-01' })
    expect(weekBounds('2024-02-29')).toEqual({ start: '2024-02-26', end: '2024-03-03' })
  })
  it('counts logged intensity minutes and distinct strength days, not unlogged rest days', () => {
    const workouts = [
      exercise({ id: 'a', dayKey: '2026-11-02', durationMinutes: 30, isStrengthTraining: true }),
      exercise({ id: 'b', dayKey: '2026-11-02', durationMinutes: 20, intensity: 'vigorous', isStrengthTraining: true }),
      exercise({ id: 'c', dayKey: '2026-11-04', durationMinutes: 60, intensity: null }),
      exercise({ id: 'out-of-week', dayKey: '2026-10-25', durationMinutes: 20, isStrengthTraining: true })
    ]
    expect(calculateActivityWeek('2026-11-06', workouts)).toMatchObject({
      entries: 3, loggedMinutes: 110, moderateMinutes: 30, vigorousMinutes: 20,
      unclassifiedMinutes: 60, loggedStrengthDays: 1
    })
    expect(calculateActivityWeek('2026-11-06', [])).toMatchObject({ entries: 0, loggedMinutes: null, loggedStrengthDays: null })
  })
})
