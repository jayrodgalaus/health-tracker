import Dexie, { type EntityTable } from 'dexie'
import type {
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
  }
}

export const db = new HealthTrackerDatabase()
