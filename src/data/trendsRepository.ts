import { db, type HealthTrackerDatabase } from '../db/database'
import type { TrendSources } from '../domain/trends'
import { trendDays } from '../domain/trends'
import { weekBounds } from '../domain/activity'
import { toLocalDay } from '../lib/localDate'

/**
 * IndexedDB read ranges include earlier measurements/goals and full calendar weeks.
 * No values are synthesized or persisted.
 */
export async function readTrendSources(
  start: string, end: string, database: HealthTrackerDatabase = db,
  today = toLocalDay(new Date())
): Promise<TrendSources> {
  trendDays(start, end, today)
  const weekStart = weekBounds(start).start
  const weekEnd = weekBounds(end).end
  const [intake, activities, weights, goals, reviews] = await Promise.all([
    database.foodEntries.where('dayKey').between(start, end, true, true).toArray(),
    database.exerciseEntries.where('dayKey').between(weekStart, weekEnd, true, true).toArray(),
    database.weightEntries.where('dayKey').belowOrEqual(end).toArray(),
    database.goalPeriods.where('effectiveFrom').belowOrEqual(end).toArray(),
    database.dayReviews.where('dayKey').between(start, end, true, true).toArray()
  ])
  return { intake, activities, weights, goals, reviews }
}
