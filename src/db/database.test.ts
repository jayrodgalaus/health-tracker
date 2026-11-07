import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from './database'
import type { WeightEntry } from '../domain/models'

const created: HealthTrackerDatabase[] = []

afterEach(async () => {
  // Close all connections before deleting a database, or deletion can be blocked.
  const byName = new Map(created.map((database) => [database.name, database]))
  for (const database of created) database.close()
  for (const database of byName.values()) await database.delete()
  created.length = 0
})

describe('IndexedDB foundation', () => {
  it('starts with no fabricated profile, meals or weights', async () => {
    const database = new HealthTrackerDatabase('health-tracker-empty-test')
    created.push(database)
    await database.open()
    expect(await database.profiles.count()).toBe(0)
    expect(await database.foodEntries.count()).toBe(0)
    expect(await database.weightEntries.count()).toBe(0)
  })

  it('migrates a v2 complete day to a frozen v3 evaluation without dropping records', async () => {
    const name = 'health-tracker-legacy-completion'
    const legacy = new Dexie(name)
    legacy.version(2).stores({
      profiles: '&id', goalPeriods: '&id, effectiveFrom',
      savedFoods: '&id, name, updatedAt',
      foodEntries: '&id, dayKey, recordedAt, savedFoodId',
      exerciseEntries: '&id, dayKey, startedAt',
      weightEntries: '&id, dayKey, recordedAt',
      dayReviews: '&dayKey', appSettings: '&id'
    })
    await legacy.open()
    const now = '2026-10-05T12:00:00.000Z'
    await legacy.table('profiles').add({
      id: 'primary', birthDate: '1990-01-01', heightCm: 170, activityLevel: null,
      sexForEquation: null, goal: 'maintain',
      units: { mass: 'kg', height: 'cm', fluid: 'ml' }, createdAt: now, updatedAt: now
    })
    await legacy.table('goalPeriods').add({
      id: 'past', effectiveFrom: '2026-10-01',
      targets: { energyKcal: 2000, proteinG: null, carbohydratesG: null, fatG: null,
        fiberG: null, sodiumMg: null, fluidMl: null, activityMinutes: null },
      createdAt: now
    })
    await legacy.table('foodEntries').add({
      id: 'meal', dayKey: '2026-10-05', kind: 'food', recordedAt: now,
      name: 'Synthetic meal', savedFoodId: null, quantity: 1, unit: 'serving',
      labelBasis: { quantity: 1, unit: 'serving' },
      nutrientsSnapshot: { energyKcal: 2000, proteinG: null, carbohydratesG: null,
        fatG: null, saturatedFatG: null, fiberG: null, sugarsG: null, sodiumMg: null },
      fluidMl: null, createdAt: now, updatedAt: now
    })
    await legacy.table('dayReviews').add({
      dayKey: '2026-10-05', isComplete: true, markedAt: now, updatedAt: now
    })
    legacy.close()
    const reopened = new HealthTrackerDatabase(name)
    created.push(reopened)
    const review = await reopened.dayReviews.get('2026-10-05')
    expect(review?.frozen?.summary.evaluation.status).toBe('onTarget')
    expect(review?.frozen?.summary.evaluation.results[0]?.target).toBe(2000)
    expect(await reopened.foodEntries.count()).toBe(1)
    await reopened.goalPeriods.update('past', {
      targets: { energyKcal: 1000, proteinG: null, carbohydratesG: null, fatG: null,
        fiberG: null, sodiumMg: null, fluidMl: null, activityMinutes: null }
    })
    expect((await reopened.dayReviews.get('2026-10-05'))?.frozen?.summary.evaluation.status).toBe('onTarget')
  })

  it('persists a weight across close/reopen and retains the local day', async () => {
    const name = 'health-tracker-persistence-test'
    const first = new HealthTrackerDatabase(name)
    created.push(first)
    const entry: WeightEntry = {
      id: 'synthetic-weight-1',
      dayKey: '2025-06-10',
      recordedAt: '2025-06-10T07:00:00+08:00',
      weightKg: 70.5,
      createdAt: '2025-06-10T07:00:00+08:00',
      updatedAt: '2025-06-10T07:00:00+08:00'
    }
    await first.weightEntries.put(entry)
    first.close()

    const reopened = new HealthTrackerDatabase(name)
    created.push(reopened)
    expect(await reopened.weightEntries.get(entry.id)).toEqual(entry)
  })
})
