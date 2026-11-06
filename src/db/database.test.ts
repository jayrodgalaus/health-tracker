import 'fake-indexeddb/auto'
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
