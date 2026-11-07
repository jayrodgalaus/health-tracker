import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import {
  DEFAULT_WATER_PRESETS_ML, readNutrientComparisonLimits, readWaterPresets,
  saveNutrientComparisonLimits, saveWaterPresets
} from './settingsRepository'

let names: string[] = []
afterEach(async () => {
  for (const name of names) {
    const database = new HealthTrackerDatabase(name)
    await database.delete()
  }
  names = []
})
function database(name: string) { names.push(name); return new HealthTrackerDatabase(name) }

describe('local water presets and non-destructive migration', () => {
  it('defaults without persisting invented user settings', async () => {
    const d = database('water-settings-defaults')
    expect(await readWaterPresets(d)).toEqual(DEFAULT_WATER_PRESETS_ML)
    expect(await d.appSettings.count()).toBe(0)
    d.close()
  })
  it('validates and persists four customized quick-add volumes', async () => {
    const name = 'water-settings-custom'
    const first = database(name)
    await expect(saveWaterPresets([0, 200, 400, 600], first)).rejects.toThrow()
    await expect(saveWaterPresets([100, 100, 200, 300], first)).rejects.toThrow()
    expect(await first.appSettings.count()).toBe(0)
    await saveWaterPresets([175, 275, 400, 650], first)
    first.close()
    const reopened = new HealthTrackerDatabase(name)
    expect(await readWaterPresets(reopened)).toEqual([175, 275, 400, 650])
    reopened.close()
  })
  it('keeps comparison limits unset until explicitly saved, without inventing defaults', async () => {
    const d = database('limits-defaults')
    expect(await readNutrientComparisonLimits(d)).toEqual({ carbohydratesG: null, sugarsG: null, sodiumMg: null })
    expect(await d.appSettings.count()).toBe(0)
    d.close()
  })
  it('persists each limit and water presets without erasing the other form', async () => {
    const name = 'limits-persistence'
    const first = database(name)
    await expect(saveNutrientComparisonLimits({ carbohydratesG: null, sugarsG: 0, sodiumMg: 1500 }, first)).rejects.toThrow(/Sugar limit/)
    await expect(saveNutrientComparisonLimits({ carbohydratesG: null, sugarsG: 45, sodiumMg: Number.NaN }, first)).rejects.toThrow(/Sodium limit/)
    await expect(saveNutrientComparisonLimits({ carbohydratesG: 0, sugarsG: 45, sodiumMg: 2000 }, first)).rejects.toThrow(/Carbs limit/)
    expect(await first.appSettings.count()).toBe(0)
    await saveWaterPresets([175, 275, 400, 650], first)
    await saveNutrientComparisonLimits({ carbohydratesG: 165, sugarsG: 42.5, sodiumMg: 1750 }, first)
    await saveWaterPresets([200, 300, 450, 700], first)
    first.close()
    const reopened = new HealthTrackerDatabase(name)
    expect(await readWaterPresets(reopened)).toEqual([200, 300, 450, 700])
    expect(await readNutrientComparisonLimits(reopened)).toEqual({ carbohydratesG: 165, sugarsG: 42.5, sodiumMg: 1750 })
    await saveNutrientComparisonLimits({ carbohydratesG: null, sugarsG: null, sodiumMg: 2100 }, reopened)
    expect(await readWaterPresets(reopened)).toEqual([200, 300, 450, 700])
    expect(await readNutrientComparisonLimits(reopened)).toEqual({ carbohydratesG: null, sugarsG: null, sodiumMg: 2100 })
    reopened.close()
  })
  it('keeps older water-only settings compatible with the new optional limits', async () => {
    const d = database('limits-legacy-settings')
    await saveWaterPresets([125, 250, 375, 500], d)
    expect(await readNutrientComparisonLimits(d)).toEqual({ carbohydratesG: null, sugarsG: null, sodiumMg: null })
    await saveNutrientComparisonLimits({ carbohydratesG: 140, sugarsG: 30, sodiumMg: null }, d)
    expect(await readWaterPresets(d)).toEqual([125, 250, 375, 500])
    expect(await readNutrientComparisonLimits(d)).toEqual({ carbohydratesG: 140, sugarsG: 30, sodiumMg: null })
    d.close()
  })
  it('keeps prior sugar/sodium-only settings valid and preserves their values', async () => {
    const d = database('limits-sugars-sodium-legacy')
    await d.appSettings.put({ id: 'local', waterPresetsMl: [150, 250, 350, 500],
      sugarLimitG: 50, sodiumLimitMg: 2300, updatedAt: '2026-11-06T12:00:00Z' })
    expect(await readNutrientComparisonLimits(d)).toEqual({
      carbohydratesG: null, sugarsG: 50, sodiumMg: 2300
    })
    await saveNutrientComparisonLimits({ carbohydratesG: 200, sugarsG: 50, sodiumMg: 2300 }, d)
    expect(await readNutrientComparisonLimits(d)).toEqual({
      carbohydratesG: 200, sugarsG: 50, sodiumMg: 2300
    })
    d.close()
  })
  it('upgrades a v1 database to v2 without deleting weight or food logs', async () => {
    const name = 'water-settings-migration'
    names.push(name)
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      profiles: '&id',
      goalPeriods: '&id, effectiveFrom',
      savedFoods: '&id, name, updatedAt',
      foodEntries: '&id, dayKey, recordedAt, savedFoodId',
      exerciseEntries: '&id, dayKey, startedAt',
      weightEntries: '&id, dayKey, recordedAt',
      dayReviews: '&dayKey'
    })
    const timestamp = '2026-11-06T12:00:00Z'
    await legacy.table('weightEntries').add({
      id: 'synthetic-weight', dayKey: '2026-11-04', weightKg: 72,
      recordedAt: timestamp, createdAt: timestamp, updatedAt: timestamp
    })
    await legacy.table('foodEntries').add({
      id: 'synthetic-food', dayKey: '2026-11-04', recordedAt: timestamp,
      kind: 'food', name: 'synthetic entry', quantity: 1, unit: 'serving',
      labelBasis: { quantity: 1, unit: 'serving' },
      savedFoodId: null, fluidMl: null,
      nutrientsSnapshot: { energyKcal: 100, proteinG: null, carbohydratesG: null, fatG: null,
        saturatedFatG: null, fiberG: null, sugarsG: null, sodiumMg: null },
      createdAt: timestamp, updatedAt: timestamp
    })
    legacy.close()
    const current = new HealthTrackerDatabase(name)
    expect((await current.weightEntries.get('synthetic-weight'))?.weightKg).toBe(72)
    expect((await current.foodEntries.get('synthetic-food'))?.nutrientsSnapshot.energyKcal).toBe(100)
    expect(await readWaterPresets(current)).toEqual(DEFAULT_WATER_PRESETS_ML)
    await saveWaterPresets([125, 250, 375, 500], current)
    expect(await current.foodEntries.count()).toBe(1)
    current.close()
  })
})
