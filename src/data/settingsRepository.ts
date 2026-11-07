import { db, type HealthTrackerDatabase } from '../db/database'
import type { AppSettings } from '../domain/models'
import {
  EMPTY_NUTRIENT_COMPARISON_LIMITS, validateNutrientComparisonLimits,
  type NutrientComparisonLimits
} from '../domain/nutrientLimits'

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

/** No assumed limits: each comparison is enabled only by an explicit preference. */
export async function readNutrientComparisonLimits(
  database: HealthTrackerDatabase = db
): Promise<NutrientComparisonLimits> {
  const settings = await database.appSettings.get('local')
  return {
    sugarsG: settings?.sugarLimitG ?? EMPTY_NUTRIENT_COMPARISON_LIMITS.sugarsG,
    sodiumMg: settings?.sodiumLimitMg ?? EMPTY_NUTRIENT_COMPARISON_LIMITS.sodiumMg
  }
}

/** Preserve other preferences even when water and nutrient forms save separately. */
export async function saveWaterPresets(
  values: readonly number[],
  database: HealthTrackerDatabase = db
): Promise<AppSettings> {
  validateWaterPresets(values)
  return database.transaction('rw', database.appSettings, async () => {
    const previous = await database.appSettings.get('local')
    const settings: AppSettings = {
      ...previous, id: 'local', waterPresetsMl: [...values], updatedAt: new Date().toISOString()
    }
    await database.appSettings.put(settings)
    return settings
  })
}

export async function saveNutrientComparisonLimits(
  limits: NutrientComparisonLimits,
  database: HealthTrackerDatabase = db
): Promise<AppSettings> {
  validateNutrientComparisonLimits(limits)
  return database.transaction('rw', database.appSettings, async () => {
    const previous = await database.appSettings.get('local')
    const settings: AppSettings = {
      ...previous, id: 'local',
      waterPresetsMl: previous?.waterPresetsMl ?? [...DEFAULT_WATER_PRESETS_ML],
      sugarLimitG: limits.sugarsG, sodiumLimitMg: limits.sodiumMg,
      updatedAt: new Date().toISOString()
    }
    await database.appSettings.put(settings)
    return settings
  })
}
