import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import { EMPTY_TARGETS, type ProfileValues } from '../domain/profile'
import { readGoalForDay, readProfile, saveProfileAndGoals } from './profileRepository'
import { deleteWeight, listWeights, moveWeight, readWeightForDay, saveWeight } from './weightRepository'

let databases: HealthTrackerDatabase[] = []
afterEach(async () => {
  const copies = [...databases]
  for (const database of copies) database.close()
  for (const database of copies) await database.delete()
  databases = []
})

const profile: ProfileValues = {
  birthDate: '1990-06-12', ageYears: null, ageAsOf: null,
  heightCm: 175, sexForEquation: null, activityLevel: null,
  goal: 'maintain', units: { mass: 'kg', height: 'cm', fluid: 'ml' }
}
const goals = (date: string, energyKcal: number | null = null) => ({
  effectiveFrom: date, goalType: 'maintain' as const,
  targetWeightKg: null, targets: { ...EMPTY_TARGETS, energyKcal }
})
function fresh(name: string) {
  const database = new HealthTrackerDatabase(name)
  databases.push(database)
  return database
}

describe('profile, goals and weight repositories', () => {
  it('creates profile and first weight atomically; returns after reopening', async () => {
    const name = 'phase1-onboarding-restart'
    const first = fresh(name)
    await saveProfileAndGoals(profile, goals('2026-11-06'), 72.5, first, '2026-11-06')
    first.close()
    const reopened = fresh(name)
    expect((await readProfile(reopened))?.heightCm).toBe(175)
    expect(await readWeightForDay('2026-11-06', reopened)).toMatchObject({ weightKg: 72.5 })
    expect((await readGoalForDay('2026-11-06', reopened))?.goalType).toBe('maintain')
  })
  it('changing units does not modify the canonical stored weight or height', async () => {
    const database = fresh('phase1-unit-preferences')
    await saveProfileAndGoals(profile, goals('2026-11-06'), 72.125, database, '2026-11-06')
    await saveProfileAndGoals({
      ...profile, units: { mass: 'lb', height: 'ft-in', fluid: 'fl-oz' }
    }, goals('2026-11-06'), null, database, '2026-11-06')
    expect((await readProfile(database))?.heightCm).toBe(175)
    expect((await readWeightForDay('2026-11-06', database))?.weightKg).toBe(72.125)
  })
  it('rejects malformed onboarding without committing a partial profile', async () => {
    const database = fresh('phase1-atomic-rejection')
    await expect(saveProfileAndGoals(profile, goals('2026-11-06'), -50, database, '2026-11-06')).rejects.toThrow()
    expect(await readProfile(database)).toBeNull()
    expect(await database.weightEntries.count()).toBe(0)
  })
  it('applies historical goals without rewriting previous months or weights', async () => {
    const database = fresh('phase1-goal-history')
    await saveProfileAndGoals(profile, goals('2026-10-01', 2100), 74, database, '2026-10-01')
    await saveProfileAndGoals(profile, goals('2026-11-06', 2400), null, database, '2026-11-06')
    expect((await readGoalForDay('2026-10-20', database))?.targets.energyKcal).toBe(2100)
    expect((await readGoalForDay('2026-11-06', database))?.targets.energyKcal).toBe(2400)
    expect(await database.weightEntries.count()).toBe(1)
  })
  it('upserts rather than duplicates, supports historical move and deletion', async () => {
    const database = fresh('phase1-weight-edits')
    const first = await saveWeight('2025-01-01', 70, database, '2026-11-06')
    const changed = await saveWeight('2025-01-01', 71.2, database, '2026-11-06')
    expect(changed.id).toBe(first.id)
    expect((await listWeights(database)).length).toBe(1)
    await moveWeight('2025-01-01', '2025-02-01', 71.2, database, '2026-11-06')
    expect(await readWeightForDay('2025-01-01', database)).toBeNull()
    expect((await readWeightForDay('2025-02-01', database))?.weightKg).toBe(71.2)
    await deleteWeight('2025-02-01', database)
    expect(await listWeights(database)).toEqual([])
  })
  it('rejects day move conflicts and corrupt duplicate legacy rows without deleting data', async () => {
    const database = fresh('phase1-weight-conflicts')
    await saveWeight('2025-01-01', 71, database, '2026-11-06')
    await saveWeight('2025-02-01', 72, database, '2026-11-06')
    await expect(moveWeight('2025-01-01', '2025-02-01', 70, database, '2026-11-06')).rejects.toThrow()
    expect(await database.weightEntries.count()).toBe(2)
    const legacy = await readWeightForDay('2025-01-01', database)
    await database.weightEntries.add({ ...legacy!, id: 'legacy-duplicate' })
    await expect(saveWeight('2025-01-01', 70, database, '2026-11-06')).rejects.toThrow()
    expect(await database.weightEntries.count()).toBe(3)
  })
  it('rejects future weight dates and invalid numeric weights', async () => {
    const database = fresh('phase1-invalid-weights')
    await expect(saveWeight('2027-01-01', 72, database, '2026-11-06')).rejects.toThrow()
    await expect(saveWeight('2025-01-01', Infinity, database, '2026-11-06')).rejects.toThrow()
    expect(await database.weightEntries.count()).toBe(0)
  })
})
