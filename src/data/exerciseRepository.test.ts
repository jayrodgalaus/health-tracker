import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import { calculateActivityDay, calculateActivityWeek } from '../domain/activity'
import { deleteExercise, listExerciseForDay, listExerciseForWeek, saveExercise, type ExerciseDraft } from './exerciseRepository'
import { listWeights, saveWeight } from './weightRepository'

const created: HealthTrackerDatabase[] = []
const make = (name: string) => { const value = new HealthTrackerDatabase(name); created.push(value); return value }
afterEach(async () => {
  const names = [...new Set(created.map(value => value.name))]
  for (const value of created) value.close()
  for (const name of names) await new HealthTrackerDatabase(name).delete()
  created.length = 0
})

const base: ExerciseDraft = {
  dayKey: '2026-11-06',
  activity: 'Table tennis',
  durationMinutes: 45,
  intensity: 'moderate',
  calorieMethod: 'unknown',
  met: null,
  manualActiveKcal: null,
  isStrengthTraining: false,
  timeOfDay: '18:30',
  notes: 'Recreational session'
}

describe('IndexedDB exercise repository', () => {
  it('persists a local-day workout after closing and reopening', async () => {
    const name = 'activity-persistence'
    const first = make(name)
    const logged = await saveExercise(base, undefined, first, '2026-11-06')
    first.close()
    const reopened = make(name)
    expect((await listExerciseForDay('2026-11-06', reopened))[0]).toMatchObject({
      id: logged.id, dayKey: '2026-11-06', activity: 'Table tennis',
      timeOfDay: '18:30', durationMinutes: 45,
      estimatedEnergyKcal: null, estimationMethod: 'unknown'
    })
  })

  it('edits day, intensity and method in place, then deletes without changing other entries', async () => {
    const database = make('activity-edit-delete')
    const original = await saveExercise(base, undefined, database, '2026-11-06')
    await saveExercise({ ...base, activity: 'Walking', dayKey: '2026-11-04', durationMinutes: 30,
      calorieMethod: 'manualActive', manualActiveKcal: 75, intensity: 'light' }, original.id, database, '2026-11-06')
    expect((await listExerciseForDay('2026-11-06', database)).length).toBe(0)
    const moved = (await listExerciseForDay('2026-11-04', database))[0]
    if (!moved) throw new Error('Expected the moved exercise entry to exist.')
    expect(moved.id).toBe(original.id)
    expect(moved.estimatedEnergyKcal).toBe(75)
    expect(calculateActivityDay('2026-11-04', [moved], [], true).knownIncrementalKcal).toBe(75)
    await deleteExercise(original.id, database)
    expect(await database.exerciseEntries.count()).toBe(0)
  })

  it('persists distance-only walking, edits it to timed running, and retains genuine unknown minutes', async () => {
    const name = 'walk-run-distance-persistence'
    const first = make(name)
    const distanceOnly = await saveExercise({
      ...base, activity: 'Walking', durationMinutes: null, distanceKm: 5,
      calorieMethod: 'distanceNet', intensity: 'light'
    }, undefined, first, '2026-11-06')
    expect(distanceOnly).toMatchObject({
      durationMinutes: null, distanceKm: 5, estimationMethod: 'distanceNet',
      estimatedEnergyKcal: null
    })
    first.close()
    const reopened = make(name)
    const stored = (await listExerciseForDay('2026-11-06', reopened))[0]
    expect(stored).toMatchObject({ durationMinutes: null, distanceKm: 5 })
    await saveWeight('2026-11-05', 70, reopened, '2026-11-06')
    expect(calculateActivityDay('2026-11-06', [stored!], await listWeights(reopened), true)).toMatchObject({
      loggedMinutes: null, missingDurationEntries: 1, knownIncrementalKcal: 210
    })
    const changed = await saveExercise({
      ...base, activity: 'Running', durationMinutes: 30, distanceKm: 4,
      calorieMethod: 'distanceNet'
    }, distanceOnly.id, reopened, '2026-11-06')
    expect(changed.id).toBe(distanceOnly.id)
    expect(calculateActivityDay('2026-11-06', [changed], await listWeights(reopened), true))
      .toMatchObject({ loggedMinutes: 30, knownIncrementalKcal: 252 })
    const timeOnly = await saveExercise({
      ...base, activity: 'Walking', durationMinutes: 25, distanceKm: null,
      calorieMethod: 'activityTimeNet'
    }, changed.id, reopened, '2026-11-06')
    expect(timeOnly).toMatchObject({
      durationMinutes: 25, distanceKm: null, estimationMethod: 'activityTimeNet'
    })
  })

  it('rejects impossible duration, timestamps, future day, gross/ambiguous method and bad numbers', async () => {
    const database = make('activity-validation')
    const invalid: ExerciseDraft[] = [
      { ...base, durationMinutes: -1 },
      { ...base, durationMinutes: Infinity },
      { ...base, durationMinutes: null },
      { ...base, activity: 'Running', durationMinutes: null, distanceKm: null },
      { ...base, activity: 'Cycling', distanceKm: 3 },
      { ...base, activity: 'Walking', distanceKm: -1 },
      { ...base, activity: 'Running', distanceKm: Number.NaN },
      { ...base, activity: 'Walking', distanceKm: 301 },
      { ...base, activity: 'Running', durationMinutes: null, distanceKm: 3, calorieMethod: 'metNet', met: 3 },
      { ...base, activity: 'Walking', distanceKm: null, calorieMethod: 'distanceNet' },
      { ...base, activity: 'Running', distanceKm: 3, calorieMethod: 'activityTimeNet' },
      { ...base, dayKey: '2026-11-07' },
      { ...base, timeOfDay: '25:00' },
      { ...base, intensity: 'maximal' as ExerciseDraft['intensity'] },
      { ...base, calorieMethod: 'gross' as ExerciseDraft['calorieMethod'] },
      { ...base, calorieMethod: 'metNet', met: 0 },
      { ...base, calorieMethod: 'manualActive', manualActiveKcal: Number.NaN },
      { ...base, calorieMethod: 'manualActive', manualActiveKcal: 50, met: 5 },
      { ...base, notes: 'x'.repeat(501) }
    ]
    for (const draft of invalid) {
      await expect(saveExercise(draft, undefined, database, '2026-11-06')).rejects.toThrow()
    }
    expect(await database.exerciseEntries.count()).toBe(0)
  })

  it('recomputes MET estimate after a previous weight correction, never uses a future weight', async () => {
    const database = make('activity-weight-recalc')
    const activity = await saveExercise({ ...base, calorieMethod: 'metNet', met: 4 },
      undefined, database, '2026-11-06')
    await saveWeight('2026-11-07', 82, database, '2026-11-07')
    expect(calculateActivityDay('2026-11-06', [activity], await listWeights(database), true).knownIncrementalKcal).toBeNull()
    await saveWeight('2026-11-01', 70, database, '2026-11-07')
    const first = calculateActivityDay('2026-11-06', [activity], await listWeights(database), true)
    expect(first.knownIncrementalKcal).toBeCloseTo(165.375)
    await saveWeight('2026-11-01', 72, database, '2026-11-07')
    const revised = calculateActivityDay('2026-11-06', [activity], await listWeights(database), true)
    expect(revised.knownIncrementalKcal).toBeCloseTo(170.1)
    expect((await database.exerciseEntries.get(activity.id))?.estimatedEnergyKcal).toBeNull()
  })

  it('queries only selected local week and correctly counts distinct strength days', async () => {
    const database = make('activity-week-query')
    await saveExercise({ ...base, dayKey: '2026-11-02', isStrengthTraining: true }, undefined, database, '2026-11-06')
    await saveExercise({ ...base, dayKey: '2026-11-02', durationMinutes: 20, isStrengthTraining: true }, undefined, database, '2026-11-06')
    await saveExercise({ ...base, dayKey: '2026-10-31' }, undefined, database, '2026-11-06')
    const summary = calculateActivityWeek('2026-11-06', await listExerciseForWeek('2026-11-06', database))
    expect(summary).toMatchObject({ entries: 2, loggedMinutes: 65, moderateMinutes: 65, loggedStrengthDays: 1 })
  })
})
