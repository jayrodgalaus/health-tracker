import type { FoodEntry, LabelBasis, NutrientSnapshot, ServingUnit } from './models'

/** Same unit classes can be converted. Mass and volume cannot cross without density. */
const GRAMS_PER_OZ = 28.349523125
const ML_PER_US_FL_OZ = 29.5735295625

export const NUTRIENT_FIELDS = [
  'energyKcal', 'proteinG', 'carbohydratesG', 'fatG', 'saturatedFatG',
  'fiberG', 'sugarsG', 'sodiumMg', 'potassiumMg'
] as const

export type NutrientField = typeof NUTRIENT_FIELDS[number]
export type CompleteNutrition = Record<NutrientField, number | null>

export function emptyNutrition(): CompleteNutrition {
  return Object.fromEntries(NUTRIENT_FIELDS.map(field => [field, null])) as CompleteNutrition
}

const NUTRIENT_LIMITS: Record<NutrientField, number> = {
  energyKcal: 15000,
  proteinG: 2000,
  carbohydratesG: 3000,
  fatG: 2000,
  saturatedFatG: 2000,
  fiberG: 1000,
  sugarsG: 3000,
  sodiumMg: 100000,
  potassiumMg: 100000
}

export function validatePortion(value: number, unit: ServingUnit): void {
  if (!['g', 'ml', 'oz', 'fl-oz', 'piece', 'serving'].includes(unit)) throw new Error('Unrecognized portion unit.')
  if (!Number.isFinite(value) || value <= 0 || value > 100000) throw new Error('Portion must be greater than zero and within the allowed limit.')
}

export function validateNutrition(nutrients: NutrientSnapshot): void {
  for (const field of NUTRIENT_FIELDS) {
    const value = nutrients[field]
    if (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0 || value > NUTRIENT_LIMITS[field])) {
      throw new Error(`Invalid ${field}: enter a nonnegative, finite value within the allowed limit.`)
    }
  }
}

function canonicalQuantity(quantity: number, unit: ServingUnit): { group: string; amount: number } {
  switch (unit) {
    case 'g': return { group: 'mass', amount: quantity }
    case 'oz': return { group: 'mass', amount: quantity * GRAMS_PER_OZ }
    case 'ml': return { group: 'volume', amount: quantity }
    case 'fl-oz': return { group: 'volume', amount: quantity * ML_PER_US_FL_OZ }
    case 'serving': return { group: 'serving', amount: quantity }
    case 'piece': return { group: 'piece', amount: quantity }
  }
}

/** Do not infer ml↔g or pieces↔grams; reference and consumed units must be compatible. */
export function portionRatio(reference: LabelBasis, quantity: number, unit: ServingUnit): number {
  validatePortion(reference.quantity, reference.unit)
  validatePortion(quantity, unit)
  const source = canonicalQuantity(reference.quantity, reference.unit)
  const consumed = canonicalQuantity(quantity, unit)
  if (source.group !== consumed.group) {
    throw new Error(`Cannot convert ${unit} to ${reference.unit} without additional information. Use a matching portion unit.`)
  }
  return consumed.amount / source.amount
}

/** Full precision retained in storage, rounding only at display time. */
export function scaleNutrition(
  reference: NutrientSnapshot,
  basis: LabelBasis,
  quantity: number,
  unit: ServingUnit
): CompleteNutrition {
  validateNutrition(reference)
  const ratio = portionRatio(basis, quantity, unit)
  return Object.fromEntries(NUTRIENT_FIELDS.map(field => {
    const value = reference[field]
    return [field, value === undefined || value === null ? null : value * ratio]
  })) as CompleteNutrition
}

export interface MetricCoverage {
  /** Null when nothing is known; a known measured zero is the number 0. */
  knownAmount: number | null
  knownEntryCount: number
  unknownEntryCount: number
  totalEntryCount: number
  complete: boolean
}

export interface IntakeSummary {
  entries: number
  foods: number
  beverages: number
  nutrients: Record<NutrientField, MetricCoverage>
  fluids: MetricCoverage
}

function coverage(values: (number | null | undefined)[]): MetricCoverage {
  const known = values.filter((value): value is number => value !== null && value !== undefined)
  return {
    knownAmount: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
    knownEntryCount: known.length,
    unknownEntryCount: values.length - known.length,
    totalEntryCount: values.length,
    complete: values.length > 0 && values.length === known.length
  }
}

/** Pure aggregation: each intake entry contributes exactly once; drinks carry fluid separately. */
export function aggregateIntake(entries: readonly FoodEntry[]): IntakeSummary {
  const nutrients = Object.fromEntries(NUTRIENT_FIELDS.map(field => [
    field, coverage(entries.map(entry => entry.nutrientsSnapshot[field]))
  ])) as Record<NutrientField, MetricCoverage>
  return {
    entries: entries.length,
    foods: entries.filter(entry => entry.kind === 'food').length,
    beverages: entries.filter(entry => entry.kind === 'beverage').length,
    nutrients,
    fluids: coverage(entries.filter(entry => entry.kind === 'beverage').map(entry => entry.fluidMl))
  }
}

export function waterNutrition(): CompleteNutrition {
  return {
    ...emptyNutrition(),
    energyKcal: 0,
    proteinG: 0,
    carbohydratesG: 0,
    fatG: 0,
    saturatedFatG: 0,
    fiberG: 0,
    sugarsG: 0
  }
}

export function fluidMlFromPortion(quantity: number, unit: ServingUnit): number | null {
  validatePortion(quantity, unit)
  return unit === 'ml' || unit === 'fl-oz' ? canonicalQuantity(quantity, unit).amount : null
}
