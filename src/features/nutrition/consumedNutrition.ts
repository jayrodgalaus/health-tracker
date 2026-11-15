import type { LabelBasis, ServingUnit } from '../../domain/models'
import { portionRatioWithServing, scaleNutrition } from '../../domain/nutrition'
import {
  inputsFromNutrition, nutritionFromInputs, parseNumber, type NutrientInputs
} from './NutritionFields'

/** The displayed numbers describe the portion being logged, never the per-100-g source. */
export function consumedNutritionInputs(
  reference: NutrientInputs,
  basis: LabelBasis,
  quantityRaw: string,
  unit: ServingUnit,
  servingAmount?: LabelBasis | null
): NutrientInputs {
  try {
    const amount = parseNumber(quantityRaw, 'consumed amount')!
    const portion = scaleNutrition(nutritionFromInputs(reference), basis, amount, unit, servingAmount)
    return Object.fromEntries(Object.entries(portion).map(([key, value]) =>
      [key, value == null ? '' : String(Number(value.toPrecision(12)))]
    )) as NutrientInputs
  } catch {
    // Invalid or absent amount cannot produce an assessable portion.
    return inputsFromNutrition()
  }
}

/** A user override is made in consumed units; the reference remains in 100 g units. */
export function referenceValueFromConsumedInput(
  raw: string, basis: LabelBasis, amount: number, unit: ServingUnit,
  servingAmount?: LabelBasis | null
): string {
  if (!raw.trim()) return ''
  const value = parseNumber(raw, 'nutrient', true)
  if (value === null) return ''
  const ratio = portionRatioWithServing(basis, amount, unit, servingAmount)
  return String(value / ratio)
}
