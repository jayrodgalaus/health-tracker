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

  it('persists a Kitchen recipe and copies incomplete numeric coverage into immutable intake', async () => {
    const database = create('nutrition-kitchen-coverage')
    const recipe = {
      ingredients: [
        { name: 'Synthetic flour', source: 'usda' as const,
          nutritionSource: { provider: 'usda-sr-legacy' as const, fdcId: 169704, release: '2018-04' as const },
          quantity: 100, unit: 'g' as const,
          labelBasis: { quantity: 100, unit: 'g' as const },
          nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 150, proteinG: 9 } },
        { name: 'Synthetic sauce', source: 'savedFood' as const,
          quantity: 100, unit: 'g' as const,
          labelBasis: { quantity: 100, unit: 'g' as const },
          nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 50 } }
      ],
      finishedAmount: { quantity: 600, unit: 'g' as const },
      servingCount: 3
    }
    const saved = await saveSavedFood({
      name: 'Kitchen batch', kind: 'food',
      labelBasis: { quantity: 600, unit: 'g' },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 200, proteinG: 9 },
      incompleteNutrientFields: ['proteinG'], recipe
    }, undefined, database)
    const logged = await logSavedFood(saved.id, '2026-11-06', 300, 'g', null, database, '2026-11-06')
    expect(logged.nutrientsSnapshot.energyKcal).toBe(100)
    expect(logged.nutrientsSnapshot.proteinG).toBe(4.5)
    expect(logged.incompleteNutrientFields).toEqual(['proteinG'])
    expect(aggregateIntake([logged]).nutrients.proteinG).toMatchObject({
      knownAmount: 4.5, complete: false, unknownEntryCount: 1
    })
    expect(aggregateIntake([logged]).nutrients.energyKcal.complete).toBe(true)
    // An edit to the saved label doesn't rewrite the already recorded meal.
    await saveSavedFood({
      name: 'Modified batch', kind: 'food',
      labelBasis: { quantity: 600, unit: 'g' },
      referenceNutrients: { ...emptyNutrition(), energyKcal: 250, proteinG: 9 }
    }, saved.id, database)
    expect((await database.savedFoods.get(saved.id))?.recipe).toBeUndefined()
    expect((await database.foodEntries.get(logged.id))?.incompleteNutrientFields).toEqual(['proteinG'])
    database.close()
  })

  it('logs and edits cooked batch portions by serving and mass without rewriting historic nutrition', async () => {
    const database = create('kitchen-serving-snapshot')
    const saved = await saveSavedFood({
      name:'Synthetic casserole', kind:'food',
      labelBasis:{quantity:600,unit:'g'},
      referenceNutrients:{...emptyNutrition(),energyKcal:900,proteinG:60},
      recipe:{ finishedAmount:{quantity:600,unit:'g'}, servingCount:3,
        ingredients:[{name:'Synthetic oats',source:'savedFood',quantity:100,unit:'g',
          labelBasis:{quantity:100,unit:'g'},nutrientsSnapshot:{...emptyNutrition(),energyKcal:900}}]
      }
    },undefined,database)
    const portion = await logSavedFood(saved.id, '2026-11-06', 1.5, 'serving', null, database, '2026-11-06')
    expect(portion.quantity).toBe(1.5)
    expect(portion.unit).toBe('serving')
    expect(portion.servingAmount).toEqual({quantity:200,unit:'g'})
    expect(portion.labelBasis).toEqual({quantity:600,unit:'g'})
    expect(portion.referenceNutrientsSnapshot?.energyKcal).toBe(900)
    expect(portion.nutrientsSnapshot.energyKcal).toBe(450)
    expect(portion.nutrientsSnapshot.proteinG).toBe(30)
    const grams = await logSavedFood(saved.id,'2026-11-06',150,'g',null,database,'2026-11-06')
    expect(grams.nutrientsSnapshot.energyKcal).toBe(225)
    expect(grams.servingAmount).toBeUndefined()
    const adjusted = await saveIntake({
      dayKey:portion.dayKey,kind:'food',name:portion.name,savedFoodId:saved.id,
      quantity:2,unit:'serving',labelBasis:portion.labelBasis,
      referenceNutrients:portion.referenceNutrientsSnapshot!,
      servingAmount:portion.servingAmount
    },portion.id,database,'2026-11-06')
    expect(adjusted.nutrientsSnapshot.energyKcal).toBe(600)
    expect(adjusted.servingAmount).toEqual({quantity:200,unit:'g'})
    await saveSavedFood({
      name:'Casserole adjusted',kind:'food',
      labelBasis:{quantity:600,unit:'g'},
      referenceNutrients:{...emptyNutrition(),energyKcal:1200}
    },saved.id,database)
    const frozen=await database.foodEntries.get(portion.id)
    expect(frozen?.nutrientsSnapshot.energyKcal).toBe(600)
    expect(frozen?.servingAmount).toEqual({quantity:200,unit:'g'})
  })

  it('requires servings to be measured before logging cooked batches by serving', async () => {
    const database = create('kitchen-no-servings')
    const saved = await saveSavedFood({
      name:'Synthetic soup',kind:'beverage',
      labelBasis:{quantity:800,unit:'ml'},
      referenceNutrients:{...emptyNutrition(),energyKcal:320},
      fluidMlPerBasis:800,
      recipe:{finishedAmount:{quantity:800,unit:'ml'},
        ingredients:[{name:'Synthetic water',source:'plainWater',quantity:250,unit:'ml',
          labelBasis:{quantity:1,unit:'ml'},nutrientsSnapshot:{...emptyNutrition(),energyKcal:0},fluidMl:250}]}
    },undefined,database)
    await expect(logSavedFood(saved.id,'2026-11-06',1,'serving',null,database,'2026-11-06'))
      .rejects.toThrow(/no measured amount per serving/)
    const inMl=await logSavedFood(saved.id,'2026-11-06',200,'ml',null,database,'2026-11-06')
    expect(inMl.nutrientsSnapshot.energyKcal).toBe(80)
    expect(inMl.fluidMl).toBe(200)
    expect(await database.foodEntries.count()).toBe(1)
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
