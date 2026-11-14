import type { KitchenRecipe, LabelBasis, NutrientFieldName, NutrientSnapshot } from './models'
import { emptyNutrition, NUTRIENT_FIELDS, portionRatio, validateNutrition, validatePortion } from './nutrition'

/** Strictly distinguish a known zero from a numeric subtotal with incomplete coverage. */
export function validateIncompleteNutrients(
  fields: readonly NutrientFieldName[] | undefined,
  nutrients: NutrientSnapshot
): void {
  if (fields === undefined) return
  if (!Array.isArray(fields) || fields.length > NUTRIENT_FIELDS.length ||
      fields.some(field => !NUTRIENT_FIELDS.includes(field)) ||
      new Set(fields).size !== fields.length) {
    throw new Error('Invalid incomplete nutrient fields.')
  }
  for (const field of fields as readonly NutrientFieldName[]) {
    if (nutrients[field] == null) {
      throw new Error('An incomplete subtotal must have a numeric known amount; unknown nutrients remain null.')
    }
  }
}

export function totalRecipeNutrition(recipe: Pick<KitchenRecipe, 'ingredients'>): {
  nutrients: NutrientSnapshot
  incompleteNutrientFields: NutrientFieldName[]
} {
  if (!recipe.ingredients.length) throw new Error('Add at least one ingredient.')
  const nutrients = emptyNutrition()
  const incompleteNutrientFields: NutrientFieldName[] = []
  for (const field of NUTRIENT_FIELDS) {
    const known = recipe.ingredients.map(item => item.nutrientsSnapshot[field])
      .filter((amount): amount is number => amount !== null && amount !== undefined)
    if (known.length) nutrients[field] = known.reduce((a, b) => a + b, 0)
    if (known.length && recipe.ingredients.some(item =>
      item.nutrientsSnapshot[field] == null || item.incompleteNutrientFields?.includes(field))) {
      incompleteNutrientFields.push(field)
    }
  }
  return { nutrients, incompleteNutrientFields }
}

/** Servings are optional: use the measured final cooked mass/volume when supplied. */
export function perServingAmount(
  finishedAmount: KitchenRecipe['finishedAmount'], servingCount: number | null | undefined
): LabelBasis | null {
  if (!finishedAmount || servingCount == null) return null
  if (!Number.isFinite(servingCount) || servingCount <= 0 || servingCount > 10000) {
    throw new Error('Invalid number of servings.')
  }
  validatePortion(finishedAmount.quantity, finishedAmount.unit)
  return { quantity: finishedAmount.quantity / servingCount, unit: finishedAmount.unit }
}

export function servingsForAmount(
  finishedAmount: KitchenRecipe['finishedAmount'], oneServing: LabelBasis
): number | null {
  if (!finishedAmount) return null
  return 1 / portionRatio(finishedAmount, oneServing.quantity, oneServing.unit)
}

export function validateKitchenRecipe(recipe: KitchenRecipe, basis?: LabelBasis): void {
  if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length || recipe.ingredients.length > 100) {
    throw new Error('A recipe needs 1–100 ingredients.')
  }
  if (recipe.finishedAmount != null) {
    if (!['g', 'ml'].includes(recipe.finishedAmount.unit)) throw new Error('Finished amount must be grams or milliliters.')
    validatePortion(recipe.finishedAmount.quantity, recipe.finishedAmount.unit)
    if (basis && Math.abs(portionRatio(basis, recipe.finishedAmount.quantity, recipe.finishedAmount.unit) - 1) > 1e-9) {
      throw new Error('The saved label basis must represent the measured finished batch.')
    }
  }
  if (recipe.servingCount != null) {
    if (!Number.isFinite(recipe.servingCount) || recipe.servingCount <= 0 || recipe.servingCount > 10000) {
      throw new Error('Invalid number of servings.')
    }
  }
  for (const ingredient of recipe.ingredients) {
    if (!ingredient.name.trim() || ingredient.name.length > 150) throw new Error('Invalid ingredient name.')
    if (!['savedFood','savedDrink','plainWater','usda'].includes(ingredient.source)) {
      throw new Error('Invalid ingredient source.')
    }
    validatePortion(ingredient.quantity, ingredient.unit)
    portionRatio(ingredient.labelBasis, ingredient.quantity, ingredient.unit)
    validateNutrition(ingredient.nutrientsSnapshot)
    validateIncompleteNutrients(ingredient.incompleteNutrientFields, ingredient.nutrientsSnapshot)
    if (ingredient.fluidMl != null &&
        (!Number.isFinite(ingredient.fluidMl) || ingredient.fluidMl < 0 || ingredient.fluidMl > 30000)) {
      throw new Error('Invalid ingredient fluid volume.')
    }
    if (ingredient.source === 'plainWater' &&
        (ingredient.nutrientsSnapshot.energyKcal !== 0 || ingredient.fluidMl == null)) {
      throw new Error('Water requires zero known calories and a measured volume.')
    }
  }
}
