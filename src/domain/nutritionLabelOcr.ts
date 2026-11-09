import type { LabelBasis, NutrientSnapshot } from './models'

export type ScanNutrient = keyof NutrientSnapshot
export interface ParsedNutritionLabel {
  /** Partial label: absent data stays unknown, not an inferred zero. */
  nutrients: Partial<Record<ScanNutrient,number>>
  basis: LabelBasis | null
  servingDescription: string | null
}

const numberPattern = '(\\d+(?:[.,]\\d+)?)'
const amountPattern = new RegExp(numberPattern + '\\s*(mg|g)\\b','i')

function numeric(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g,'')
  const normalized = /^\d{1,3},\d{3}$/.test(cleaned) && !cleaned.startsWith('0,')
    ? cleaned.replace(',','') : cleaned.replace(',','.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function measured(line: string, field: ScanNutrient): number | null {
  const match = line.match(amountPattern)
  if (!match) return null
  const value = numeric(match[1] ?? '')
  if (value === null) return null
  const unit = match[2]?.toLowerCase()
  if (field === 'sodiumMg' || field === 'potassiumMg')
    return unit === 'g' ? value*1000 : value
  // Do not confuse milligrams with grams for macronutrients.
  return unit === 'g' ? value : null
}

const fields: Array<[ScanNutrient,RegExp]> = [
  ['saturatedFatG',/^(?:(?:of\s+which|including)\s+)?saturat(?:ed|es)\s*(?:fat|fats)?\b/i],
  ['sodiumMg',/^sodium\b/i],
  ['potassiumMg',/^potassium\b/i],
  ['proteinG',/^proteins?\b/i],
  ['carbohydratesG',/^(?:total\s+)?carbohydrates?\b|^carbs\b/i],
  ['fatG',/^(?:total\s+)?fats?\b/i],
  ['fiberG',/^(?:dietary\s+)?fib(?:er|re)\b/i],
  ['sugarsG',/^(?:total\s+)?sugars?\b|^of\s+which\s+sugars?\b/i]
]

function calories(line: string): number | null {
  const header = line.match(/^calories\b(?:\s*\(kcal\))?\s*[:=]?\s*(\d+(?:[.,]\d+)?)(?:\s*kcal)?\b/i)
  if (header) return numeric(header[1] ?? '')
  if (!/^energy\b/i.test(line)) return null
  // Energy in kJ alone is not silently converted to kcal.
  const kcal = line.match(new RegExp(numberPattern+'\\s*kcal\\b','i'))
  return kcal ? numeric(kcal[1] ?? '') : null
}

function basisFromText(text: string, lines: string[]): {
  basis: LabelBasis | null; servingDescription: string | null
} {
  // When a label exposes multiple quantity columns, do not silently choose
  // a basis for the first OCR value: the user must select the correct one.
  const hasPerServing = /\bper\s+serving\b/i.test(text)
  const hasPer100g = /\bper\s*100\s*(?:g|grams?)\b/i.test(text)
  const hasPer100ml = /\bper\s*100\s*(?:ml|millilit(?:er|re)s?)\b/i.test(text)
  if (hasPerServing && (hasPer100g || hasPer100ml))
    return {basis:null,servingDescription:null}
  if (hasPer100g)
    return {basis:{quantity:100,unit:'g'},servingDescription:null}
  if (hasPer100ml)
    return {basis:{quantity:100,unit:'ml'},servingDescription:null}
  const servingLine = lines.find(line => /^serving\s*size\b/i.test(line))
  const description = servingLine
    ? servingLine.replace(/^serving\s*size\s*[,;:.\-]*\s*/i,'').trim().slice(0,150)
    : null
  if (description) {
    const match = description.match(new RegExp(numberPattern+'\\s*(g|grams?|ml|millilit(?:er|re)s?)\\b','i'))
    if (match) {
      const amount = numeric(match[1] ?? '')
      const unit = match[2]?.toLowerCase().startsWith('m') ? 'ml' : 'g'
      if (amount !== null && amount > 0) return {
        basis:{quantity:amount,unit},servingDescription:description
      }
    }
    return {basis:{quantity:1,unit:'serving'},servingDescription:description}
  }
  return /\bper\s+serving\b/i.test(text)
    ? {basis:{quantity:1,unit:'serving'},servingDescription:null}
    : {basis:null,servingDescription:null}
}

/**
 * Conservative, deterministic OCR interpretation. The first explicit amount on
 * each nutrient line is read; a label with ambiguous columns needs human review.
 */
export function parseNutritionLabelOcr(text: string): ParsedNutritionLabel {
  // OCR frequently collapses adjacent printed rows into one long line.
  // Split only on known nutrient names, never on ingredient descriptions.
  const nutritionText = text.split(/\bINGREDIENTS\s*:/i)[0] ?? ''
  const expanded = nutritionText.replace(/\s+(?=(?:Calories(?!\s+from\s+Fat)|Energy|Total\s+Fat|Saturated\s+Fat|Total\s+Carbohydrates?|Dietary\s+Fib(?:er|re)|Total\s+Sugars?|Sugars|Proteins?|Sodium|Potassium)\b)/gi,'\n')
  const lines = expanded.split(/\r?\n/).map(line => line.replace(/[|]/g,' ').trim())
    .filter(Boolean).slice(0,160)
  const normalized = lines.join('\n')
  const nutrients: ParsedNutritionLabel['nutrients'] = {}
  for (const line of lines) {
    if (!Object.prototype.hasOwnProperty.call(nutrients,'energyKcal')) {
      const kcal = calories(line)
      if (kcal !== null && kcal <= 15000) nutrients.energyKcal = kcal
    }
    for (const [field,regex] of fields) {
      if (nutrients[field] !== undefined || !regex.test(line)) continue
      const value = measured(line,field)
      if (value !== null && value <= (field.endsWith('Mg') ? 100000 : 3000))
        nutrients[field] = value
    }
  }
  return {nutrients,...basisFromText(normalized,lines)}
}
