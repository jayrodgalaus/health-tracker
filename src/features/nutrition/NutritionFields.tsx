import type { NutrientSnapshot } from '../../domain/models'
import { NUTRIENT_FIELDS, emptyNutrition, type NutrientField } from '../../domain/nutrition'

export type NutrientInputs = Record<NutrientField, string>

export const NUTRIENT_LABELS: Record<NutrientField, string> = {
  energyKcal: 'Calories (kcal)',
  proteinG: 'Protein (g)',
  carbohydratesG: 'Carbs (g)',
  fatG: 'Fat (g)',
  saturatedFatG: 'Saturated fat (g)',
  fiberG: 'Fiber (g)',
  sugarsG: 'Sugars (g)',
  sodiumMg: 'Sodium (mg)',
  potassiumMg: 'Potassium (mg)'
}

export function inputsFromNutrition(nutrients: NutrientSnapshot = emptyNutrition()): NutrientInputs {
  return Object.fromEntries(NUTRIENT_FIELDS.map(field => [
    field, nutrients[field] === null || nutrients[field] === undefined ? '' : String(nutrients[field])
  ])) as NutrientInputs
}

export function parseNumber(raw: string, label: string, optional = false): number | null {
  const normalized = raw.trim()
  if (!normalized) {
    if (optional) return null
    throw new Error(`Enter ${label}.`)
  }
  // Decimal commas are accepted for mobile locales; group separators are not.
  const decimal = normalized.replace(',', '.')
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(decimal)) throw new Error(`Enter a valid number for ${label}.`)
  const value = Number(decimal)
  if (!Number.isFinite(value)) throw new Error(`Enter a finite number for ${label}.`)
  return value
}

export function nutritionFromInputs(values: NutrientInputs): NutrientSnapshot {
  return Object.fromEntries(NUTRIENT_FIELDS.map(field => [
    field, parseNumber(values[field], NUTRIENT_LABELS[field], true)
  ])) as unknown as NutrientSnapshot
}

interface Props {
  values: NutrientInputs
  onChange: (field: NutrientField, value: string) => void
  legend?: string
}

export function NutritionFields({ values, onChange, legend = 'Nutrition facts' }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NUTRIENT_FIELDS.map(field => (
          <label key={field} className="block text-sm font-medium text-slate-800">
            {NUTRIENT_LABELS[field]}
            <input
              className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              type="number" min="0" step="any" inputMode="decimal"
              value={values[field]}
              onChange={event => onChange(field, event.target.value)}
              placeholder="Unknown"
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
