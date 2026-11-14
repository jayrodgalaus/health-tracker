import { describe, expect, it } from 'vitest'
import type { KitchenRecipe } from './models'
import { emptyNutrition } from './nutrition'
import {
  perServingAmount, servingsForAmount, totalRecipeNutrition,
  validateIncompleteNutrients, validateKitchenRecipe
} from './kitchenRecipe'

const ingredient = (name: string, nutrients: ReturnType<typeof emptyNutrition>) => ({
  name, source: 'savedFood' as const, quantity: 100, unit: 'g' as const,
  labelBasis: { quantity: 100, unit: 'g' as const },
  nutrientsSnapshot: nutrients
})
const recipe: KitchenRecipe = {
  ingredients: [
    ingredient('Synthetic chickpeas', { ...emptyNutrition(), energyKcal: 150, proteinG: 9 }),
    ingredient('Synthetic sauce', { ...emptyNutrition(), energyKcal: 50 })
  ],
  finishedAmount: { quantity: 600, unit: 'g' }, servingCount: 3
}

describe('Kitchen recipe metadata and deterministic math', () => {
  it('sums known nutrients and preserves uncertainty for partial fields', () => {
    const result = totalRecipeNutrition(recipe)
    expect(result.nutrients.energyKcal).toBe(200)
    expect(result.nutrients.proteinG).toBe(9)
    expect(result.incompleteNutrientFields).toEqual(['proteinG'])
    expect(result.nutrients.fiberG).toBeNull()
  })
  it('computes servings bidirectionally without inventing cooked yield', () => {
    expect(perServingAmount(recipe.finishedAmount, recipe.servingCount))
      .toEqual({ quantity: 200, unit: 'g' })
    expect(servingsForAmount(recipe.finishedAmount, { quantity: 150, unit: 'g' })).toBe(4)
    expect(() => servingsForAmount(recipe.finishedAmount, { quantity: 100, unit: 'ml' }))
      .toThrow(/Cannot convert/)
    expect(perServingAmount(null, 3)).toBeNull()
    expect(perServingAmount(recipe.finishedAmount, null)).toBeNull()
  })
  it('rejects invalid uncertainty, incompatible yield, and fabricated plain water', () => {
    expect(() => validateIncompleteNutrients(['fiberG'], emptyNutrition())).toThrow(/numeric/)
    expect(() => validateKitchenRecipe(recipe, { quantity: 600, unit: 'g' })).not.toThrow()
    expect(() => validateKitchenRecipe(recipe, { quantity: 500, unit: 'g' })).toThrow(/basis/)
    expect(() => validateKitchenRecipe({
      ...recipe, ingredients: [{ ...recipe.ingredients[0]!, source: 'plainWater' }]
    })).toThrow(/Water/)
    expect(() => validateKitchenRecipe({
      ...recipe, servingCount: 0
    })).toThrow(/servings/)
  })
})
