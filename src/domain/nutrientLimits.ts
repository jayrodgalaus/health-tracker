import type { MetricCoverage } from './nutrition'

/** Optional user-defined daily *upper comparison* limits, not intake recommendations. */
export interface NutrientComparisonLimits {
  carbohydratesG: number | null
  sugarsG: number | null
  sodiumMg: number | null
}

export const EMPTY_NUTRIENT_COMPARISON_LIMITS: NutrientComparisonLimits = {
  carbohydratesG: null,
  sugarsG: null,
  sodiumMg: null
}

export const MAX_CARBOHYDRATE_LIMIT_G = 2000
export const MAX_SUGAR_LIMIT_G = 3000
export const MAX_SODIUM_LIMIT_MG = 100000

/** A blank limit disables the comparison. Zero is not a usable denominator. */
export function validateNutrientComparisonLimits(limits: NutrientComparisonLimits): void {
  const { carbohydratesG, sugarsG, sodiumMg } = limits
  if (carbohydratesG !== null && (!Number.isFinite(carbohydratesG) || carbohydratesG < 0.1 || carbohydratesG > MAX_CARBOHYDRATE_LIMIT_G)) {
    throw new Error('Carbs limit must be between 0.1 and 2,000 g, or blank.')
  }
  if (sugarsG !== null && (!Number.isFinite(sugarsG) || sugarsG < 0.1 || sugarsG > MAX_SUGAR_LIMIT_G)) {
    throw new Error('Sugar limit must be between 0.1 and 3,000 g, or blank.')
  }
  if (sodiumMg !== null && (!Number.isFinite(sodiumMg) || sodiumMg < 1 || sodiumMg > MAX_SODIUM_LIMIT_MG)) {
    throw new Error('Sodium limit must be between 1 and 100,000 mg, or blank.')
  }
}

/**
 * A percentage uses only known logged nutrient amounts. Partial coverage
 * is a lower bound and must be marked “≥” by the UI. Unknown is never zero.
 */
export function knownAmountPercent(metric: MetricCoverage, referenceAmount: number | null): number | null {
  if (referenceAmount === null || !Number.isFinite(referenceAmount) || referenceAmount <= 0 ||
      metric.knownAmount === null || !Number.isFinite(metric.knownAmount)) return null
  return Number((metric.knownAmount / referenceAmount * 100).toFixed(1))
}
