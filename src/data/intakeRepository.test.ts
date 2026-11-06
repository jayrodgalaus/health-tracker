import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthTrackerDatabase } from '../db/database'
import { aggregateIntake, emptyNutrition } from '../domain/nutrition'
import { deleteIntake, deleteSavedFood, listIntakeForDay, logSavedFood, saveIntake, saveSavedFood, saveWater } from './intakeRepository'

const instances: HealthTrackerDatabase[] = []
function create(name: string) { const database = new HealthTrackerDatabase(name); instances.push(database); return database }
afterEach(async () => {
  for (const instance of instances) instance.close()
  const names = [...new Set(instances.map(instance => instance.name))]
  for (const name of names) await new HealthTrackerDatabase(name).delete()
  instances.length = 0
})

describe('offline food/drink persistence', () => {
  it('logs a saved label with a frozen nutrient and basis snapshot', async () => {
    const name = 'nutrition-snapshot-persistence'
    const first = create(name)
    const saved = await saveSavedFood({
      name: 'Test oats', kind: 'food', brand: null, labelBasis: { quantity: 100, unit: 'g' },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 400, proteinG: 14 }
    }, undefined, first)
    const meal = await logSavedFood(saved.id, '2026-11-05', 75, 'g', 'breakfast', first, '2026-11-06')
    expect(meal.nutrientsSnapshot.energyKcal).toBe(300)
    expect(meal.referenceNutrientsSnapshot?.proteinG).toBe(14)
    await saveSavedFood({
      name: 'Test oats NEW LABEL', kind: 'food', labelBasis: { quantity: 100, unit: 'g' },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 600 }
    }, saved.id, first)
    await deleteSavedFood(saved.id, first)
    first.close()
    const reopened = create(name)
    const original = (await listIntakeForDay('2026-11-05', reopened))[0]
    expect(original?.name).toBe('Test oats')
    expect(original?.labelBasis).toEqual({ quantity: 100, unit: 'g' })
    expect(original?.nutrientsSnapshot.energyKcal).toBe(300)
    expect(original?.referenceNutrientsSnapshot?.proteinG).toBe(14)
  })

  it('counts one caloric drink plus water and an unknown-calorie drink accurately', async () => {
    const database = create('nutrition-beverage-coverage')
    await saveIntake({
      dayKey: '2026-11-06', kind: 'beverage', name: 'Fruit drink',
      quantity: 300, unit: 'ml', labelBasis: { quantity: 100, unit: 'ml' },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 40, carbohydratesG: 10 }
    }, undefined, database, '2026-11-06')
    await saveWater('2026-11-06', 250, undefined, database, '2026-11-06')
    await saveIntake({
      dayKey: '2026-11-06', kind: 'beverage', name: 'Unspecified tea',
      quantity: 150, unit: 'ml', labelBasis: { quantity: 150, unit: 'ml' },
      referenceNutrients: emptyNutrition()
    }, undefined, database, '2026-11-06')
    const summary = aggregateIntake(await listIntakeForDay('2026-11-06', database))
    expect(summary.entries).toBe(3)
    expect(summary.nutrients.energyKcal.knownAmount).toBe(120)
    expect(summary.nutrients.energyKcal.unknownEntryCount).toBe(1)
    expect(summary.fluids.knownAmount).toBe(700)
  })

  it('edits, moves a backdated entry and deletes without leaving duplicate entries', async () => {
    const database = create('nutrition-crud')
    const draft = {
      dayKey: '2026-10-01', kind: 'food' as const, name: 'Lunch', quantity: 1, unit: 'serving' as const,
      labelBasis: { quantity: 1, unit: 'serving' as const },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 210 }
    }
    const created = await saveIntake(draft, undefined, database, '2026-11-06')
    const edited = await saveIntake({ ...draft, dayKey: '2026-10-02', quantity: 2 }, created.id, database, '2026-11-06')
    expect(edited.id).toBe(created.id)
    expect(edited.nutrientsSnapshot.energyKcal).toBe(420)
    expect(await listIntakeForDay('2026-10-01', database)).toEqual([])
    expect((await listIntakeForDay('2026-10-02', database)).length).toBe(1)
    await deleteIntake(created.id, database)
    expect(await database.foodEntries.count()).toBe(0)
  })

  it('rejects incompatible conversions and impossible inputs without writing anything', async () => {
    const database = create('nutrition-invalid')
    const draft = {
      dayKey: '2026-11-06', kind: 'food' as const, name: 'Meal',
      quantity: 75, unit: 'ml' as const,
      labelBasis: { quantity: 100, unit: 'g' as const },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 200 }
    }
    await expect(saveIntake(draft, undefined, database, '2026-11-06')).rejects.toThrow(/Cannot convert/)
    await expect(saveIntake({ ...draft, unit: 'g', referenceNutrients: { ...emptyNutrition(), proteinG: Infinity } }, undefined, database, '2026-11-06')).rejects.toThrow()
    await expect(saveWater('2026-11-06', -50, undefined, database, '2026-11-06')).rejects.toThrow()
    expect(await database.foodEntries.count()).toBe(0)
  })
})
