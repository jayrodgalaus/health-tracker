import { db, type HealthTrackerDatabase } from '../db/database'
import type { DayReview, ExerciseEntry, FoodEntry, GoalPeriod, LocalDay, WeightEntry } from '../domain/models'
import { goalOnDay } from '../domain/evaluation'
import { archiveCompletedDay } from '../domain/daySnapshot'
import { assertLocalDay } from '../domain/profile'
import { monthDays } from '../domain/calendar'
import { toLocalDay } from '../lib/localDate'

export interface DayRecords {
  intake: FoodEntry[]
  activities: ExerciseEntry[]
  weights: WeightEntry[]
  goal: GoalPeriod | null
  review: DayReview | null
}
export interface MonthRecords {
  intake: FoodEntry[]
  activities: ExerciseEntry[]
  weights: WeightEntry[]
  goals: GoalPeriod[]
  reviews: DayReview[]
}

/** All read queries remain live when called through useLiveQuery. */
export async function readDayRecords(day: LocalDay, database: HealthTrackerDatabase = db): Promise<DayRecords> {
  assertLocalDay(day)
  const [intake, activities, weights, goals, review] = await Promise.all([
    database.foodEntries.where('dayKey').equals(day).toArray(),
    database.exerciseEntries.where('dayKey').equals(day).toArray(),
    database.weightEntries.where('dayKey').belowOrEqual(day).toArray(),
    database.goalPeriods.where('effectiveFrom').belowOrEqual(day).toArray(),
    database.dayReviews.get(day)
  ])
  return { intake, activities, weights, goal: goalOnDay(day, goals), review: review ?? null }
}

/** Month view is batched (not one IndexedDB query per day). Include earlier weights/goals for estimation. */
export async function readMonthRecords(month: string, database: HealthTrackerDatabase = db): Promise<MonthRecords> {
  const days = monthDays(month)
  const first = days[0]
  const last = days.at(-1)
  if (!first || !last) throw new Error('Invalid calendar month.')
  const [intake, activities, weights, goals, reviews] = await Promise.all([
    database.foodEntries.where('dayKey').between(first, last, true, true).toArray(),
    database.exerciseEntries.where('dayKey').between(first, last, true, true).toArray(),
    database.weightEntries.where('dayKey').belowOrEqual(last).toArray(),
    database.goalPeriods.where('effectiveFrom').belowOrEqual(last).toArray(),
    database.dayReviews.where('dayKey').between(first, last, true, true).toArray()
  ])
  return { intake, activities, weights, goals, reviews }
}

/** Must run INSIDE the same Dexie transaction as every dated write. */
export async function assertDayEditable(dayKey: LocalDay, database: HealthTrackerDatabase = db): Promise<void> {
  const review = await database.dayReviews.get(dayKey)
  if (review?.isComplete) {
    throw new Error('This day is locked. Reopen it from Calendar or Log before making changes.')
  }
}

export async function readDayLocked(dayKey: LocalDay, database: HealthTrackerDatabase = db): Promise<boolean> {
  return (await database.dayReviews.get(dayKey))?.isComplete === true
}

/**
 * Complete + archive all calculations and comparison inputs atomically.
 * Reopening explicitly discards the snapshot and permits new edits.
 */
export async function setDayComplete(
  dayKey: LocalDay,
  isComplete: boolean,
  database: HealthTrackerDatabase = db,
  currentDay: LocalDay = toLocalDay(new Date())
): Promise<DayReview> {
  assertLocalDay(dayKey, 'Review date')
  if (dayKey > currentDay) throw new Error('A future day cannot be marked complete.')
  return database.transaction('rw', [
    database.dayReviews, database.profiles, database.goalPeriods, database.foodEntries,
    database.exerciseEntries, database.weightEntries, database.appSettings
  ], async () => {
    const previous = await database.dayReviews.get(dayKey)
    if (previous?.isComplete === isComplete) throw new Error(isComplete
      ? 'This day is already complete and locked.' : 'This day is not locked.')
    const now = new Date().toISOString()
    const review: DayReview = {
      dayKey, isComplete, markedAt: isComplete ? now : null,
      updatedAt: now, note: previous?.note ?? null
    }
    if (!isComplete) {
      await database.dayReviews.put(review)
      return review
    }
    const profile = await database.profiles.get('primary')
    if (!profile) throw new Error('A profile is required to archive a completed day.')
    const [intake, activities, weights, goals, settings] = await Promise.all([
      database.foodEntries.where('dayKey').equals(dayKey).toArray(),
      database.exerciseEntries.where('dayKey').equals(dayKey).toArray(),
      database.weightEntries.where('dayKey').belowOrEqual(dayKey).toArray(),
      database.goalPeriods.where('effectiveFrom').belowOrEqual(dayKey).toArray(),
      database.appSettings.get('local')
    ])
    const archived = archiveCompletedDay(review, profile, {
      intake, activities, weights, goals, settings
    }, now)
    await database.dayReviews.put(archived)
    return archived
  })
}
