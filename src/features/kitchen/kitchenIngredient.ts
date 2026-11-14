import type { IngredientFood } from '../../data/ingredientCatalog'
import type { KitchenIngredientSnapshot, SavedFood, ServingUnit } from '../../domain/models'
import {
  fluidMlFromPortion, portionRatio, scaleNutrition, validatePortion, waterNutrition
} from '../../domain/nutrition'

export type KitchenChoice =
  | { type: 'saved'; item: SavedFood }
  | { type: 'usda'; item: IngredientFood }
  | { type: 'water' }

export function kitchenChoiceLabel(choice: KitchenChoice): string {
  return choice.type === 'water' ? 'Plain water' : choice.item.name
}

export function kitchenChoiceBasis(choice: KitchenChoice) {
  return choice.type === 'water'
    ? { quantity: 1, unit: 'ml' as const }
    : choice.type === 'saved'
      ? choice.item.labelBasis : { quantity: 100, unit: 'g' as const }
}

/** An immutable, scaled ingredient snapshot; never a daily food/drink log. */
export function prepareKitchenIngredient(
  choice: KitchenChoice, quantity: number, unit: ServingUnit
): KitchenIngredientSnapshot {
  const basis = kitchenChoiceBasis(choice)
  validatePortion(quantity, unit)
  const ratio = portionRatio(basis, quantity, unit)
  if (choice.type === 'water') {
    const ml = fluidMlFromPortion(quantity, unit)
    if (ml === null) throw new Error('Plain water requires a volume.')
    return {
      name: 'Plain water', source: 'plainWater', quantity, unit,
      labelBasis: basis, nutrientsSnapshot: waterNutrition(), fluidMl: ml
    }
  }
  if (choice.type === 'saved') {
    const food = choice.item
    return {
      name: food.name, source: food.kind === 'beverage' ? 'savedDrink' : 'savedFood',
      savedFoodId: food.id, quantity, unit, labelBasis: { ...basis },
      nutrientsSnapshot: scaleNutrition(food.nutrientsPerBasis, basis, quantity, unit),
      ...(food.incompleteNutrientFields?.length
        ? { incompleteNutrientFields: [...food.incompleteNutrientFields] } : {}),
      fluidMl: food.kind === 'beverage' && food.fluidMlPerBasis != null
        ? food.fluidMlPerBasis * ratio : null
    }
  }
  return {
    name: choice.item.name, source: 'usda', quantity, unit,
    labelBasis: basis, nutritionSource: choice.item.nutritionSource,
    nutrientsSnapshot: scaleNutrition(choice.item.nutrients, basis, quantity, unit)
  }
}
