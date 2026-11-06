import { db, type HealthTrackerDatabase } from '../db/database'
import { assertLocalDay, assertWeight } from '../domain/profile'
import type { LocalDay, WeightEntry } from '../domain/models'
import { toLocalDay } from '../lib/localDate'

export async function listWeights(database: HealthTrackerDatabase = db): Promise<WeightEntry[]> {
  return database.weightEntries.orderBy('dayKey').reverse().toArray()
}

export async function readWeightForDay(day: LocalDay, database: HealthTrackerDatabase = db): Promise<WeightEntry | null> {
  assertLocalDay(day)
  const matches = await database.weightEntries.where('dayKey').equals(day).toArray()
  if (matches.length > 1) throw new Error('Multiple existing measurements for this date require manual review.')
  return matches[0] ?? null
}

function validateDayForLogging(day: LocalDay, today: LocalDay): void {
  assertLocalDay(day, 'Weight date')
  if (day > today) throw new Error('Cannot log a weight on a future date.')
}

/**
 * Phase 0 indexed weights by day without enforcing uniqueness at the database
 * level. A transaction and a conflict check enforce one primary weight/day
 * without dropping any legacy records or requiring a destructive migration.
 */
export async function saveWeight(
  day: LocalDay,
  kg: number,
  database: HealthTrackerDatabase = db,
  today: LocalDay = toLocalDay(new Date())
): Promise<WeightEntry> {
  validateDayForLogging(day, today)
  assertWeight(kg)
  return database.transaction('rw', database.weightEntries, async () => {
    const existing = await readWeightForDay(day, database)
    const now = new Date().toISOString()
    const entry: WeightEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      dayKey: day,
      weightKg: kg,
      recordedAt: existing?.recordedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    await database.weightEntries.put(entry)
    return entry
  })
}

/** Move a measurement to a different local day only when the destination is empty. */
export async function moveWeight(
  fromDay: LocalDay,
  toDay: LocalDay,
  kg: number,
  database: HealthTrackerDatabase = db,
  today: LocalDay = toLocalDay(new Date())
): Promise<WeightEntry> {
  validateDayForLogging(fromDay, today)
  validateDayForLogging(toDay, today)
  assertWeight(kg)
  return database.transaction('rw', database.weightEntries, async () => {
    const current = await readWeightForDay(fromDay, database)
    if (!current) throw new Error('The original measurement no longer exists.')
    if (fromDay !== toDay && await readWeightForDay(toDay, database)) {
      throw new Error('A weight entry already exists for the destination date.')
    }
    const updated: WeightEntry = { ...current, dayKey: toDay, weightKg: kg, updatedAt: new Date().toISOString() }
    await database.weightEntries.put(updated)
    return updated
  })
}

export async function deleteWeight(day: LocalDay, database: HealthTrackerDatabase = db): Promise<void> {
  await database.transaction('rw', database.weightEntries, async () => {
    const entry = await readWeightForDay(day, database)
    if (entry) await database.weightEntries.delete(entry.id)
  })
}
