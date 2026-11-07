import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import { EMPTY_TARGETS } from '../domain/profile'
import { calculateDay, goalOnDay } from '../domain/evaluation'
import type { Profile } from '../domain/models'
import { emptyNutrition } from '../domain/nutrition'
import { readDayRecords, readMonthRecords, setDayComplete } from './dayRepository'
import { saveIntake, deleteIntake } from './intakeRepository'
import { saveWeight, moveWeight } from './weightRepository'
import { saveExercise, deleteExercise } from './exerciseRepository'

const created: HealthTrackerDatabase[] = []
const make = (name: string) => { const database = new HealthTrackerDatabase(name); created.push(database); return database }
afterEach(async () => {
  const names = [...new Set(created.map(database => database.name))]
  for (const database of created) database.close()
  for (const name of names) await new HealthTrackerDatabase(name).delete()
  created.length = 0
})
const now = '2026-11-06T15:00:00.000Z'
const profile: Profile = {
  id: 'primary', birthDate: '1994-02-03', heightCm: 170,
  activityLevel: null, goal: 'maintain', sexForEquation: null,
  units: { mass: 'kg', height: 'cm', fluid: 'ml' }, createdAt: now, updatedAt: now
}
function dayFrom(db: HealthTrackerDatabase, day: string) {
  return readDayRecords(day, db).then(records =>
    calculateDay({ dayKey: day, profile, ...records }, now))
}

describe('day completion, goal history and month data', () => {
  it('saves completion/reopening across restart and never scores empty days red', async () => {
    const name = 'phase2-reviews'
    const first = make(name)
    await first.profiles.add(profile)
    expect((await dayFrom(first, '2026-11-05')).evaluation.status).toBe('incomplete')
    await setDayComplete('2026-11-05', true, first, '2026-11-06')
    first.close()
    const reopened = make(name)
    expect((await readDayRecords('2026-11-05', reopened)).review?.isComplete).toBe(true)
    expect((await dayFrom(reopened, '2026-11-05')).evaluation.status).toBe('incomplete')
    await setDayComplete('2026-11-05', false, reopened, '2026-11-06')
    expect((await readDayRecords('2026-11-05', reopened)).review).toMatchObject({ isComplete: false, markedAt: null })
  })
  it('refuses a future date without creating a review', async () => {
    const database = make('phase2-future')
    await expect(setDayComplete('2026-11-07', true, database, '2026-11-06')).rejects.toThrow()
    await expect(setDayComplete('2026-02-30', true, database, '2026-11-06')).rejects.toThrow()
    expect(await database.dayReviews.count()).toBe(0)
  })
  it('uses target effective on the historical day, not a future revision', async () => {
    const database = make('phase2-goals')
    await database.goalPeriods.bulkAdd([
      { id: 'old', effectiveFrom: '2026-10-01', targets: { ...EMPTY_TARGETS, energyKcal: 2000 }, createdAt: now },
      { id: 'new', effectiveFrom: '2026-11-06', targets: { ...EMPTY_TARGETS, energyKcal: 2400 }, createdAt: now }
    ])
    const oldDay = await readDayRecords('2026-10-15', database)
    const current = await readDayRecords('2026-11-06', database)
    expect(oldDay.goal?.targets.energyKcal).toBe(2000)
    expect(current.goal?.targets.energyKcal).toBe(2400)
    expect(goalOnDay('2026-09-25', await database.goalPeriods.toArray())).toBeNull()
  })
  it('updates computed day after a food edit and reopening the day', async () => {
    const database = make('phase2-live-recompute')
    const goal = { id: 'target', effectiveFrom: '2026-11-01', targets: { ...EMPTY_TARGETS, energyKcal: 2000 }, createdAt: now }
    await database.goalPeriods.add(goal)
    const entry = {
      id: 'meal', dayKey: '2026-11-06', recordedAt: now, createdAt: now, updatedAt: now,
      kind: 'food' as const, name: 'Synthetic meal', savedFoodId: null,
      quantity: 1, unit: 'serving' as const, labelBasis: { quantity: 1, unit: 'serving' as const },
      nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 2000 }, fluidMl: null
    }
    await database.foodEntries.add(entry)
    await database.profiles.add(profile)
    await setDayComplete('2026-11-06', true, database, '2026-11-06')
    const original = await dayFrom(database, '2026-11-06')
    expect(original.evaluation.status).toBe('onTarget')
    expect((await readDayRecords('2026-11-06', database)).review?.frozen?.summary.evaluation.results[0]?.target).toBe(2000)
    // Goal edits must NOT rewrite a completed day.
    await database.goalPeriods.put({ ...goal, targets: { ...goal.targets, energyKcal: 1000 } })
    expect(await dayFrom(database, '2026-11-06')).toEqual(original)
    // Even an out-of-band record edit cannot change the archived evaluation.
    await database.foodEntries.put({ ...entry, nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 2700 } })
    expect((await dayFrom(database, '2026-11-06')).evaluation.status).toBe('onTarget')
    await setDayComplete('2026-11-06', false, database, '2026-11-06')
    expect((await dayFrom(database, '2026-11-06')).evaluation.status).toBe('incomplete')
    expect((await readDayRecords('2026-11-06', database)).review?.frozen).toBeUndefined()
    await setDayComplete('2026-11-06', true, database, '2026-11-06')
    expect((await dayFrom(database, '2026-11-06')).evaluation.status).toBe('offTarget')
    expect((await readDayRecords('2026-11-06', database)).review?.frozen?.summary.evaluation.results[0]?.target).toBe(1000)
  })
  it('blocks all intake changes, including moving into or out of a locked date, and allows edits after reopening', async () => {
    const database = make('locked-intake-repository')
    await database.profiles.put(profile)
    const draft = (dayKey: string) => ({
      dayKey, kind: 'food' as const, name: 'Test meal', quantity: 1,
      unit: 'serving' as const, labelBasis: { quantity: 1, unit: 'serving' as const },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 200 }
    })
    const one = await saveIntake(draft('2026-11-05'), undefined, database, '2026-11-06')
    const other = await saveIntake(draft('2026-11-06'), undefined, database, '2026-11-06')
    await setDayComplete('2026-11-05', true, database, '2026-11-06')
    await expect(saveIntake(draft('2026-11-05'), undefined, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(saveIntake(draft('2026-11-05'), one.id, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(saveIntake(draft('2026-11-06'), one.id, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(saveIntake(draft('2026-11-05'), other.id, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(deleteIntake(one.id, database)).rejects.toThrow(/locked/i)
    expect(await database.foodEntries.count()).toBe(2)
    await setDayComplete('2026-11-05', false, database, '2026-11-06')
    await deleteIntake(one.id, database)
    expect(await database.foodEntries.count()).toBe(1)
  })
  it('blocks exercise edits and moving exercises into or out of completed dates', async () => {
    const database = make('locked-exercise-repository')
    await database.profiles.add(profile)
    const draft = (dayKey: string) => ({
      dayKey, activity: 'Walking', durationMinutes: 30, intensity: null,
      calorieMethod: 'unknown' as const, met: null, manualActiveKcal: null,
      isStrengthTraining: false, timeOfDay: null, notes: null
    })
    const lockedEntry = await saveExercise(draft('2026-11-05'), undefined, database, '2026-11-06')
    const editableEntry = await saveExercise(draft('2026-11-06'), undefined, database, '2026-11-06')
    await setDayComplete('2026-11-05', true, database, '2026-11-06')
    await expect(saveExercise(draft('2026-11-05'), undefined, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(saveExercise(draft('2026-11-05'), lockedEntry.id, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(saveExercise(draft('2026-11-06'), lockedEntry.id, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(saveExercise(draft('2026-11-05'), editableEntry.id, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(deleteExercise(lockedEntry.id, database)).rejects.toThrow(/locked/i)
    expect(await database.exerciseEntries.count()).toBe(2)
    await setDayComplete('2026-11-05', false, database, '2026-11-06')
    await deleteExercise(lockedEntry.id, database)
    expect(await database.exerciseEntries.count()).toBe(1)
  })
  it('blocks weight edits that would alter a locked day or move its measurement', async () => {
    const database = make('locked-weight-repository')
    await database.profiles.add(profile)
    await saveWeight('2026-11-05', 70, database, '2026-11-06')
    await setDayComplete('2026-11-05', true, database, '2026-11-06')
    await expect(saveWeight('2026-11-05', 71, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(moveWeight('2026-11-05', '2026-11-06', 71, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await expect(moveWeight('2026-11-06', '2026-11-05', 71, database, '2026-11-06')).rejects.toThrow(/locked/i)
    await setDayComplete('2026-11-05', false, database, '2026-11-06')
    expect((await saveWeight('2026-11-05', 71, database, '2026-11-06')).weightKg).toBe(71)
  })
  it('preserves archived evaluation after a later profile change', async () => {
    const database = make('locked-profile-change')
    await database.profiles.put(profile)
    await database.goalPeriods.add({
      id: 'target', effectiveFrom: '2026-11-01', targets: { ...EMPTY_TARGETS, energyKcal: 2000 }, createdAt: now
    })
    await database.foodEntries.add({
      id: 'meal', dayKey: '2026-11-05', recordedAt: now, createdAt: now, updatedAt: now,
      kind: 'food', name: 'Synthetic meal', savedFoodId: null,
      quantity: 1, unit: 'serving', labelBasis: { quantity: 1, unit: 'serving' },
      nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 2000 }, fluidMl: null
    })
    await setDayComplete('2026-11-05', true, database, '2026-11-06')
    const frozen = (await readDayRecords('2026-11-05', database)).review?.frozen
    await database.profiles.put({ ...profile, birthDate: '2005-01-01', heightCm: 180, updatedAt: now })
    expect((await dayFrom(database, '2026-11-05')).evaluation).toEqual(frozen?.summary.evaluation)
    expect(frozen?.profile.heightCm).toBe(170)
  })
  it('batches a month and includes earlier weight and goals without future records', async () => {
    const database = make('phase2-month')
    await database.weightEntries.bulkAdd([
      { id: 'old', dayKey: '2026-10-10', weightKg: 70, recordedAt: now, createdAt: now, updatedAt: now },
      { id: 'future', dayKey: '2026-12-10', weightKg: 75, recordedAt: now, createdAt: now, updatedAt: now }
    ])
    await database.goalPeriods.add({ id: 'target', effectiveFrom: '2026-10-01', targets: EMPTY_TARGETS, createdAt: now })
    const records = await readMonthRecords('2026-11', database)
    expect(records.weights.map(weight => weight.id)).toEqual(['old'])
    expect(records.goals).toHaveLength(1)
    expect(records.intake).toEqual([])
  })
})
