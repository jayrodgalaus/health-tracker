import { db, type HealthTrackerDatabase } from '../db/database'
import type { DayReview, ExerciseEntry, FoodEntry, GoalPeriod, LocalDay, WeightEntry } from '../domain/models'
import { goalOnDay } from '../domain/evaluation'
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

/** A user can explicitly complete a day with few logs, but its status stays incomplete/unassessable. */
export async function setDayComplete(
  dayKey: LocalDay,
  isComplete: boolean,
  database: HealthTrackerDatabase = db,
  currentDay: LocalDay = toLocalDay(new Date())
): Promise<DayReview> {
  assertLocalDay(dayKey, 'Review date')
  if (dayKey > currentDay) throw new Error('A future day cannot be marked complete.')
  return database.transaction('rw', database.dayReviews, async () => {
    const previous = await database.dayReviews.get(dayKey)
    const now = new Date().toISOString()
    const review: DayReview = {
      dayKey, isComplete, markedAt: isComplete ? now : null,
      updatedAt: now, note: previous?.note ?? null
    }
    await database.dayReviews.put(review)
    return review
  })
}
