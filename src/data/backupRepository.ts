import { db, type HealthTrackerDatabase } from '../db/database'
import {
  BACKUP_TABLES, backupCounts, validateBackup,
  type BackupCounts, type HealthBackup
} from '../domain/backup'

/** All browser-owned tables, including preferences and day reviews, are portable. */
export async function readLocalBackup(database: HealthTrackerDatabase = db): Promise<HealthBackup> {
  return database.transaction('r', [database.profiles, database.goalPeriods,
    database.savedFoods, database.foodEntries, database.exerciseEntries,
    database.weightEntries, database.dayReviews, database.appSettings], async () => {
      const [profiles, goalPeriods, savedFoods, foodEntries,
        exerciseEntries, weightEntries, dayReviews, appSettings] = await Promise.all([
          database.profiles.toArray(), database.goalPeriods.toArray(),
          database.savedFoods.toArray(), database.foodEntries.toArray(),
          database.exerciseEntries.toArray(), database.weightEntries.toArray(),
          database.dayReviews.toArray(), database.appSettings.toArray()
        ])
      const snapshot: HealthBackup = {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        app: { name: 'health-tracker', version: '0.1.0', schemaVersion: 2 },
        tables: { profiles, goalPeriods, savedFoods, foodEntries,
          exerciseEntries, weightEntries, dayReviews, appSettings }
      }
      return validateBackup(snapshot)
    })
}

export async function countLocalRecords(database: HealthTrackerDatabase = db): Promise<BackupCounts> {
  const counts = await Promise.all([
    database.profiles.count(), database.goalPeriods.count(),
    database.savedFoods.count(), database.foodEntries.count(),
    database.exerciseEntries.count(), database.weightEntries.count(),
    database.dayReviews.count(), database.appSettings.count()
  ])
  return Object.fromEntries(BACKUP_TABLES.map((table, index) =>
    [table, counts[index] ?? 0])) as BackupCounts
}

/**
 * Validation is complete before starting the transaction. Clear+bulkAdd is
 * atomic across all eight stores: any failure rolls back the entire replacement.
 * No merges, silent deduplication, or destructive schema reinitialization.
 */
export async function replaceLocalData(
  untrusted: unknown,
  database: HealthTrackerDatabase = db
): Promise<BackupCounts> {
  const backup = validateBackup(untrusted)
  await database.transaction('rw', [database.profiles, database.goalPeriods,
    database.savedFoods, database.foodEntries, database.exerciseEntries,
    database.weightEntries, database.dayReviews, database.appSettings], async () => {
      await database.profiles.clear()
      await database.goalPeriods.clear()
      await database.savedFoods.clear()
      await database.foodEntries.clear()
      await database.exerciseEntries.clear()
      await database.weightEntries.clear()
      await database.dayReviews.clear()
      await database.appSettings.clear()
      await database.profiles.bulkAdd(backup.tables.profiles)
      await database.goalPeriods.bulkAdd(backup.tables.goalPeriods)
      await database.savedFoods.bulkAdd(backup.tables.savedFoods)
      await database.foodEntries.bulkAdd(backup.tables.foodEntries)
      await database.exerciseEntries.bulkAdd(backup.tables.exerciseEntries)
      await database.weightEntries.bulkAdd(backup.tables.weightEntries)
      await database.dayReviews.bulkAdd(backup.tables.dayReviews)
      await database.appSettings.bulkAdd(backup.tables.appSettings)
    })
  return backupCounts(backup)
}

/** Irreversible local reset; a successful transaction triggers onboarding. */
export async function deleteAllLocalRecords(database: HealthTrackerDatabase = db): Promise<void> {
  await database.transaction('rw', [database.profiles, database.goalPeriods,
    database.savedFoods, database.foodEntries, database.exerciseEntries,
    database.weightEntries, database.dayReviews, database.appSettings], async () => {
      await database.profiles.clear()
      await database.goalPeriods.clear()
      await database.savedFoods.clear()
      await database.foodEntries.clear()
      await database.exerciseEntries.clear()
      await database.weightEntries.clear()
      await database.dayReviews.clear()
      await database.appSettings.clear()
    })
}
