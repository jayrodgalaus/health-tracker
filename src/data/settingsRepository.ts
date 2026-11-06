import { db, type HealthTrackerDatabase } from '../db/database'
import type { AppSettings } from '../domain/models'

export const DEFAULT_WATER_PRESETS_ML: readonly number[] = [150, 250, 350, 500]

export function validateWaterPresets(values: readonly number[]): void {
  if (values.length !== 4) throw new Error('Configure exactly four water quick-add amounts.')
  for (const value of values) {
    if (!Number.isFinite(value) || value < 25 || value > 3000) {
      throw new Error('Each water amount must be between 25 and 3,000 ml.')
    }
  }
  if (new Set(values).size !== values.length) throw new Error('Use four different quick-add amounts.')
}

export async function readWaterPresets(database: HealthTrackerDatabase = db): Promise<number[]> {
  const record = await database.appSettings.get('local')
  return record ? [...record.waterPresetsMl] : [...DEFAULT_WATER_PRESETS_ML]
}

export async function saveWaterPresets(
  values: readonly number[],
  database: HealthTrackerDatabase = db
): Promise<AppSettings> {
  validateWaterPresets(values)
  const settings: AppSettings = { id: 'local', waterPresetsMl: [...values], updatedAt: new Date().toISOString() }
  await database.appSettings.put(settings)
  return settings
}
