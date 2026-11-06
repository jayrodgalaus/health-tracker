import Dexie, { type EntityTable } from 'dexie'
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
  }
}

export const db = new HealthTrackerDatabase()
