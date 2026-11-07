import type { NutrientSnapshot, NutritionSource } from '../domain/models'
import { emptyNutrition } from '../domain/nutrition'

/** USDA FoodData Central SR Legacy final release, April 2018. Fully bundled for offline use. */
export interface IngredientFood {
  id: number
  name: string
  group: string
  preparation: string
  nutrients: NutrientSnapshot
  nutritionSource: Extract<NutritionSource, {provider: 'usda-sr-legacy'}>
  basisUnit: 'g'
  servingDescription: null
}

type RawRow = [number, string, ...(number | null)[]]
interface CatalogData {
  release: string
  dataset: string
  fields: string[]
  records: RawRow[]
}

let catalogPromise: Promise<CatalogData> | null = null
const loadCatalog = (): Promise<CatalogData> => {
  // Dynamic import keeps the 7,793-food reference dataset out of the initial JS chunk.
  // Vite precaches the generated chunk for offline access after installation.
  catalogPromise ??= import('./usdaSrLegacy.json').then(module => module.default as CatalogData)
  return catalogPromise
}

export function usdaFoodUrl(id: number): string | null {
  return Number.isSafeInteger(id) && id > 0
    ? 'https://fdc.nal.usda.gov/food-details/' + id + '/nutrients' : null
}

const fields: (keyof NutrientSnapshot)[] = [
  'energyKcal','proteinG','carbohydratesG','fatG','saturatedFatG','fiberG','sugarsG','sodiumMg','potassiumMg'
]

function convert(row: RawRow): IngredientFood {
  const [id, description, ...values] = row
  const split = description.indexOf(',')
  const group = (split < 0 ? description : description.slice(0, split)).trim()
  const preparation = split < 0 ? 'As described in USDA' : description.slice(split + 1).trim()
  const nutrients = emptyNutrition()
  fields.forEach((field, i) => {
    nutrients[field] = values[i] ?? null
  })
  return {
    id, name: description.slice(0, 150), group, preparation,
    nutrients, nutritionSource: {provider: 'usda-sr-legacy', fdcId: id, release: '2018-04'},
    basisUnit: 'g', servingDescription: null
  }
}

function searchTerms(query: string): string[] {
  // USDA includes boiled/drained cabbage, not a separately identified
  // blanched variant; the UI discloses that these are not equivalent measurements.
  return query.toLocaleLowerCase().trim()
    .replace(/\bblanched\b/g, 'boiled')
    .replace(/\bsteamed\b/g, 'steamed')
    .split(/[^\p{L}\p{N}]+/u).filter(term => term.length >= 2)
}

function scoreDescription(description: string, rawQuery: string, terms: readonly string[]): number {
  const lower = description.toLocaleLowerCase()
  const head = lower.split(',')[0]!.trim()
  const topic = rawQuery.trim().toLocaleLowerCase()
  const primary = terms.find(term => term.length >= 3 && !['cooked','boiled','white','brown','raw','steamed','blanched'].includes(term))
  let score = (topic === head ? 100 : 0) + (primary && head === primary ? 85 : 0)
  if (primary && head.startsWith(primary)) score += 35
  if (lower.startsWith(topic)) score += 25
  if (lower.includes(', cooked') || lower.includes(', boiled') || lower.includes(', steamed')) score += 7
  if (lower.includes(', raw')) score += 6
  if (lower.includes('without salt')) score += 6
  if (lower.includes('with salt') && !topic.includes('salt')) score -= 8
  if (lower.includes('babyfood') || lower.includes('baby food')) score -= 25
  return score
}

/** Query the bundled USDA reference with no network requests or remote storage. */
export async function searchIngredientCatalog(query: string, limit = 60): Promise<IngredientFood[]> {
  const terms = searchTerms(query)
  if (!terms.length) return []
  const data = await loadCatalog()
  if (data.release !== '2018-04' || data.dataset !== 'USDA FoodData Central SR Legacy') {
    throw new Error('Unexpected USDA catalog release.')
  }
  const matches = data.records.filter(row => {
    const name = row[1].toLocaleLowerCase()
    return terms.every(term => name.includes(term))
  })
  matches.sort((a, b) =>
    scoreDescription(b[1], query, terms) - scoreDescription(a[1], query, terms) ||
    a[1].localeCompare(b[1]))
  return matches.slice(0, Math.max(0, Math.min(100, limit))).map(convert)
}
