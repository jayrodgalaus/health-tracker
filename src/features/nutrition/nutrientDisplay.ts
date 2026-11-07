import type { NutrientField } from '../../domain/nutrition'

/** The nutrients shown as individual cards in the daily nutrition summary. */
export const DISPLAY_NUTRIENT_FIELDS = [
  'proteinG', 'carbohydratesG', 'fatG', 'fiberG',
  'sugarsG', 'sodiumMg', 'potassiumMg'
] as const satisfies readonly NutrientField[]

export type DisplayNutrientField = typeof DISPLAY_NUTRIENT_FIELDS[number]

export function isDisplayNutrientField(field: string | undefined): field is DisplayNutrientField {
  return DISPLAY_NUTRIENT_FIELDS.some(candidate => candidate === field)
}

export function nutrientUnit(field: DisplayNutrientField): 'g' | 'mg' {
  return field.endsWith('Mg') ? 'mg' : 'g'
}

/** Unknown per-entry nutrient values are a dash; actual recorded zeros stay zero. */
export function formatEntryNutrient(value: number | null | undefined, field: DisplayNutrientField): string {
  if (value === null || value === undefined) return '-'
  return Number(value.toFixed(1)).toLocaleString() + ' ' + nutrientUnit(field)
}
