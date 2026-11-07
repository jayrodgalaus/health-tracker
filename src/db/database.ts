import Dexie, { type EntityTable } from 'dexie'
import { archiveLegacyReviews } from '../domain/daySnapshot'
import type {
  AppSettings,
  DayReview,
  ExerciseEntry,
  FoodEntry,
  GoalPeriod,
  Profile,
  SavedFood,
  WeightEntry
} from '../domain/models'

/**
 * IndexedDB is the sole persistent store. Schema upgrades must preserve data:
 * add version(N).stores(...).upgrade(...) when the model evolves.
 * A fresh database has no profile, entries, or assumed targets.
 */
export class HealthTrackerDatabase extends Dexie {
  appSettings!: EntityTable<AppSettings, 'id'>
  profiles!: EntityTable<Profile, 'id'>
  goalPeriods!: EntityTable<GoalPeriod, 'id'>
  savedFoods!: EntityTable<SavedFood, 'id'>
  foodEntries!: EntityTable<FoodEntry, 'id'>
  exerciseEntries!: EntityTable<ExerciseEntry, 'id'>
  weightEntries!: EntityTable<WeightEntry, 'id'>
  dayReviews!: EntityTable<DayReview, 'dayKey'>

  constructor(name = 'health-tracker') {
    super(name)
    this.version(1).stores({
      profiles: '&id',
      goalPeriods: '&id, effectiveFrom',
      savedFoods: '&id, name, updatedAt',
      foodEntries: '&id, dayKey, recordedAt, savedFoodId',
      exerciseEntries: '&id, dayKey, startedAt',
      weightEntries: '&id, dayKey, recordedAt',
      dayReviews: '&dayKey'
    })
    // Additive migration: keep every v1 table and record unchanged.
    this.version(2).stores({ appSettings: '&id' })
    // Preserve older completed days by recording their best currently available
    // historical state ONCE. Previously finalized snapshots are never rewritten.
    // No table is removed or re-keyed.
    this.version(3).stores({}).upgrade(async tx => {
      const [profile, reviews] = await Promise.all([
        tx.table<Profile, string>('profiles').get('primary'),
        tx.table<DayReview, string>('dayReviews').toArray()
      ])
      if (!profile || !reviews.some(review => review.isComplete && !review.frozen)) return
      const [intake, activities, weights, goals, settings] = await Promise.all([
        tx.table<FoodEntry, string>('foodEntries').toArray(),
        tx.table<ExerciseEntry, string>('exerciseEntries').toArray(),
        tx.table<WeightEntry, string>('weightEntries').toArray(),
        tx.table<GoalPeriod, string>('goalPeriods').toArray(),
        tx.table<AppSettings, string>('appSettings').get('local')
      ])
      const archived = archiveLegacyReviews(reviews, profile, {
        intake, activities, weights, goals, settings
      }, new Date().toISOString())
      await tx.table<DayReview, string>('dayReviews').bulkPut(archived)
    })
  }
}

export const db = new HealthTrackerDatabase()
