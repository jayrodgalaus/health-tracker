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
    expect(moved.id).toBe(original.id)
    expect(moved.estimatedEnergyKcal).toBe(75)
    expect(calculateActivityDay('2026-11-04', [moved], []).knownIncrementalKcal).toBe(75)
    await deleteExercise(original.id, database)
    expect(await database.exerciseEntries.count()).toBe(0)
  })

  it('rejects impossible duration, timestamps, future day, gross/ambiguous method and bad numbers', async () => {
    const database = make('activity-validation')
    const invalid: ExerciseDraft[] = [
      { ...base, durationMinutes: -1 },
      { ...base, durationMinutes: Infinity },
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
    expect(calculateActivityDay('2026-11-06', [activity], await listWeights(database)).knownIncrementalKcal).toBeNull()
    await saveWeight('2026-11-01', 70, database, '2026-11-07')
    const first = calculateActivityDay('2026-11-06', [activity], await listWeights(database))
    expect(first.knownIncrementalKcal).toBeCloseTo(165.375)
    await saveWeight('2026-11-01', 72, database, '2026-11-07')
    const revised = calculateActivityDay('2026-11-06', [activity], await listWeights(database))
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
