import { describe, expect, it } from 'vitest'
import type { FoodEntry, NutrientSnapshot } from './models'
import { aggregateIntake, emptyNutrition, fluidMlFromPortion, portionRatio, referenceNutritionForEntry, scaleNutrition, waterNutrition } from './nutrition'

const label = (energyKcal: number | null, proteinG: number | null = null): NutrientSnapshot => ({
  ...emptyNutrition(), energyKcal, proteinG
})
const entry = (id: string, kind: 'food' | 'beverage', nutrientsSnapshot: NutrientSnapshot, fluidMl: number | null = null): FoodEntry => ({
  id, dayKey: '2026-11-06', recordedAt: '2026-11-06T07:00:00Z',
  kind, name: id, savedFoodId: null, quantity: 1, unit: 'serving',
  labelBasis: { quantity: 1, unit: 'serving' }, nutrientsSnapshot,
  fluidMl, createdAt: '2026-11-06T07:00:00Z', updatedAt: '2026-11-06T07:00:00Z'
})

describe('nutrition scaling and completeness', () => {
  it('scales 230 kcal per serving for 1.5 servings', () => {
    expect(scaleNutrition(label(230), { quantity: 1, unit: 'serving' }, 1.5, 'serving').energyKcal).toBe(345)
  })
  it('scales 75 g against a 100 g basis and safely converts oz to g', () => {
    expect(scaleNutrition(label(200, 12), { quantity: 100, unit: 'g' }, 75, 'g').proteinG).toBe(9)
    expect(portionRatio({ quantity: 100, unit: 'g' }, 3.52739619496, 'oz')).toBeCloseTo(1, 7)
  })
  it('rejects incompatible units, invalid quantities and corrupt nutrients', () => {
    expect(() => portionRatio({ quantity: 100, unit: 'g' }, 50, 'ml')).toThrow(/Cannot convert/)
    expect(() => portionRatio({ quantity: 1, unit: 'serving' }, 100, 'g')).toThrow()
    expect(() => scaleNutrition(label(230), { quantity: 1, unit: 'serving' }, -1, 'serving')).toThrow()
    expect(() => scaleNutrition(label(Number.NaN), { quantity: 1, unit: 'serving' }, 1, 'serving')).toThrow()
  })
  it('does not substitute unknown nutrients with zero', () => {
    const summary = aggregateIntake([entry('one', 'food', label(200, 10)), entry('two', 'food', label(100, null))])
    expect(summary.nutrients.proteinG).toMatchObject({
      knownAmount: 10, knownEntryCount: 1, unknownEntryCount: 1, complete: false
    })
    expect(summary.nutrients.fiberG.knownAmount).toBeNull()
    expect(aggregateIntake([]).nutrients.energyKcal.knownAmount).toBeNull()
  })
  it('counts 120 kcal beverage once and 300 ml fluid once', () => {
    const summary = aggregateIntake([entry('drink', 'beverage', label(120), 300)])
    expect(summary.nutrients.energyKcal.knownAmount).toBe(120)
    expect(summary.fluids.knownAmount).toBe(300)
    expect(summary.entries).toBe(1)
  })
  it('reports fluid with unknown drink calories as incomplete nutrition', () => {
    const summary = aggregateIntake([entry('drink', 'beverage', label(null), 350)])
    expect(summary.nutrients.energyKcal.knownAmount).toBeNull()
    expect(summary.nutrients.energyKcal.unknownEntryCount).toBe(1)
    expect(summary.fluids.knownAmount).toBe(350)
    expect(fluidMlFromPortion(8, 'fl-oz')).toBeCloseTo(236.588, 2)
  })
  it('reconstructs a legacy label basis from consumed values for correct edits', () => {
    const historical = {
      ...entry('legacy', 'food', label(150, 7.5)),
      quantity: 75,
      unit: 'g' as const,
      labelBasis: { quantity: 100, unit: 'g' as const }
    }
    const reference = referenceNutritionForEntry(historical)
    expect(reference.energyKcal).toBe(200)
    expect(reference.proteinG).toBe(10)
    expect(scaleNutrition(reference, historical.labelBasis, 150, 'g').energyKcal).toBe(300)
  })
  it('plain water remains a zero-energy source but does not enter nutritional calculations', () => {
    const water = { ...entry('water', 'beverage', waterNutrition(), 250), beverageType: 'water' as const }
    const summary = aggregateIntake([water])
    expect(water.nutrientsSnapshot.energyKcal).toBe(0) // preserved historical snapshot
    expect(summary.nutrients.energyKcal).toMatchObject({
      knownAmount: null, knownEntryCount: 0, unknownEntryCount: 0, totalEntryCount: 0, complete: false
    })
    expect(summary.nutrients.sodiumMg.totalEntryCount).toBe(0)
    expect(summary.fluids).toMatchObject({ knownAmount: 250, complete: true })
  })
  it('does not count 3 plain-water logs in 16 nutrient entries, including legacy missing/zero labels', () => {
    const foods = Array.from({ length: 13 }, (_, i) => entry(
      String(i), 'food', { ...emptyNutrition(), energyKcal: 150, sodiumMg: i === 12 ? 105.3 : 150 }
    ))
    const water = Array.from({ length: 3 }, (_, i) => ({
      ...entry('water-' + i, 'beverage', i === 0 ? waterNutrition()
        : i === 1 ? emptyNutrition()
          : { ...waterNutrition(), sodiumMg: 0 }, 250),
      beverageType: 'water' as const
    }))
    const summary = aggregateIntake([...foods, ...water])
    expect(summary.entries).toBe(16)
    expect(summary.nutrients.sodiumMg).toMatchObject({
      knownAmount: 1905.3, knownEntryCount: 13, unknownEntryCount: 0,
      totalEntryCount: 13, complete: true
    })
    expect(summary.nutrients.energyKcal).toMatchObject({
      knownAmount: 1950, knownEntryCount: 13, unknownEntryCount: 0, totalEntryCount: 13, complete: true
    })
    expect(summary.nutrients.proteinG).toMatchObject({
      knownAmount: null, knownEntryCount: 0, unknownEntryCount: 13, totalEntryCount: 13, complete: false
    })
    expect(summary.fluids).toMatchObject({
      knownAmount: 750, knownEntryCount: 3, totalEntryCount: 3, complete: true
    })
    // Only explicitly tagged water is exempt; a beverage named Water without
    // the tag can contain minerals or unknown nutrition.
    const untagged = entry('Water', 'beverage', emptyNutrition(), 250)
    expect(aggregateIntake([...foods, untagged]).nutrients.sodiumMg).toMatchObject({
      knownAmount: 1905.3, knownEntryCount: 13, unknownEntryCount: 1, complete: false
    })
  })
  it('keeps non-water drinks with unknown sodium in the coverage denominator', () => {
    const food = entry('meal', 'food', { ...emptyNutrition(), sodiumMg: 500 })
    const drink = { ...entry('unspecified drink', 'beverage', emptyNutrition(), 300), beverageType: 'other' as const }
    const water = { ...entry('water', 'beverage', waterNutrition(), 250), beverageType: 'water' as const }
    expect(aggregateIntake([food, drink, water]).nutrients.sodiumMg).toMatchObject({
      knownAmount: 500, knownEntryCount: 1, unknownEntryCount: 1, totalEntryCount: 2, complete: false
    })
  })
})
