import { describe, expect, it } from 'vitest'
import type { FoodEntry, NutrientSnapshot } from './models'
import { aggregateIntake, emptyNutrition, fluidMlFromPortion, portionRatio, scaleNutrition, waterNutrition } from './nutrition'

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
  it('water has a known zero kcal, not an unlogged null', () => {
    expect(aggregateIntake([entry('water', 'beverage', waterNutrition(), 250)]).nutrients.energyKcal.knownAmount).toBe(0)
    expect(waterNutrition().sodiumMg).toBeNull()
  })
})
