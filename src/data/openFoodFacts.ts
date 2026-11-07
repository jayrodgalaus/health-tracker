import type { NutrientSnapshot, NutritionSource } from '../domain/models'
import { emptyNutrition } from '../domain/nutrition'

/**
 * Browser-only, opt-in lookup for packaged products. The search phrase, not
 * profile/log history, is sent to Open Food Facts on explicit button press.
 * No API key, user account, analytics or background requests.
 *
 * Open Food Facts limits product search to 10 requests/minute per IP and warns
 * against search-as-you-type. We enforce a lower per-tab cap of 6 requests/minute.
 */
const ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl'
const REQUEST_FIELDS = 'code,product_name,product_name_en,brands,nutriments,quantity,product_quantity_unit,nutrition_data_per,serving_size'
const MAX_QUERIES_PER_MINUTE = 6
const SEARCH_WINDOW_MS = 60_000
let recentSearches: number[] = []

export interface ExternalFoodResult {
  id: string
  name: string
  brand: string | null
  basisUnit: 'g' | 'ml'
  nutrients: NutrientSnapshot
  servingDescription: string | null
  nutritionSource: NutritionSource
}

type UnknownRecord = Record<string, unknown>
const asObject = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null

function safeText(value: unknown, max = 150): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max) : null
}

const acceptable = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) &&
  value >= 0 && value <= max ? value : null

function basisUnit(product: UnknownRecord): 'g' | 'ml' {
  // In OFF, *_100g values can represent either per-100-g or per-100-ml.
  // Only choose volume if the supplier explicitly identifies a volume product.
  const amountUnit = safeText(product.product_quantity_unit, 20)?.toLowerCase()
  const declared = safeText(product.nutrition_data_per, 20)?.toLowerCase()
  const quantity = safeText(product.quantity, 100) ?? ''
  const volume = declared === '100ml' || amountUnit === 'ml' || amountUnit === 'l' ||
    /^\d+(?:[.,]\d+)?\s*(?:ml|l)\b/i.test(quantity)
  return volume ? 'ml' : 'g'
}

/** Never invent calories/macros or turn unavailable fields into measured zero. */
export function convertOpenFoodFactsProduct(raw: unknown, fetchedAt: string): ExternalFoodResult | null {
  const product = asObject(raw)
  if (!product) return null
  const id = safeText(product.code, 24)
  const name = safeText(product.product_name_en) ?? safeText(product.product_name)
  if (!id || !/^\d{8,14}$/.test(id) || !name) return null
  const data = asObject(product.nutriments)
  if (!data) return null
  const number = (key: string, max: number) => acceptable(data[key], max)
  const gramsToMg = (key: string) => {
    const grams = number(key, 100)
    return grams === null ? null : grams * 1000
  }
  const nutrients: NutrientSnapshot = {
    ...emptyNutrition(),
    energyKcal: number('energy-kcal_100g', 15000),
    proteinG: number('proteins_100g', 2000),
    carbohydratesG: number('carbohydrates_100g', 3000),
    fatG: number('fat_100g', 2000),
    saturatedFatG: number('saturated-fat_100g', 2000),
    fiberG: number('fiber_100g', 1000),
    sugarsG: number('sugars_100g', 3000),
    sodiumMg: gramsToMg('sodium_100g'),
    potassiumMg: gramsToMg('potassium_100g')
  }
  if (Object.values(nutrients).every(value => value === null || value === undefined)) return null
  return {
    id,
    name,
    brand: safeText(product.brands) ,
    basisUnit: basisUnit(product),
    nutrients,
    servingDescription: safeText(product.serving_size),
    nutritionSource: { provider: 'open-food-facts', productCode: id, fetchedAt }
  }
}

export function externalFoodUrl(code: string): string | null {
  return /^\d{8,14}$/.test(code) ? 'https://world.openfoodfacts.org/product/' + code : null
}

export async function searchOpenFoodFacts(
  query: string, signal?: AbortSignal,
  requester: typeof fetch = fetch, now = Date.now()
): Promise<ExternalFoodResult[]> {
  const terms = query.trim().replace(/\s+/g, ' ')
  if (terms.length < 3 || terms.length > 80) {
    throw new Error('Enter 3–80 characters to search the product database.')
  }
  if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError')
  recentSearches = recentSearches.filter(time => now - time < SEARCH_WINDOW_MS)
  if (recentSearches.length >= MAX_QUERIES_PER_MINUTE) {
    throw new Error('Online search limit reached. Try again in a minute or enter food manually.')
  }
  recentSearches.push(now)
  const parameters = new URLSearchParams({
    action: 'process', search_simple: '1', search_terms: terms,
    json: '1', page_size: '12', fields: REQUEST_FIELDS,
    lc: 'en', app_name: 'HealthTracker', app_version: '0.1.0'
  })
  let response: Response
  try {
    response = await requester(ENDPOINT + '?' + parameters.toString(), {
      signal, method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer'
    })
  } catch (cause) {
    if (signal?.aborted) throw cause
    throw new Error('Food lookup is unavailable. Check your connection or enter nutrition manually.')
  }
  if (response.status === 429) throw new Error('Open Food Facts is rate-limiting searches. Try later or use manual entry.')
  if (!response.ok) throw new Error('Food lookup service is unavailable. You can still log manually.')
  const payload: unknown = await response.json()
  const records = asObject(payload)
  if (!records || !Array.isArray(records.products)) {
    throw new Error('Unexpected food lookup response. Enter the label manually.')
  }
  const fetchedAt = new Date(now).toISOString()
  const results: ExternalFoodResult[] = []
  const ids = new Set<string>()
  for (const product of records.products.slice(0, 30)) {
    const item = convertOpenFoodFactsProduct(product, fetchedAt)
    if (item && !ids.has(item.id)) {
      results.push(item)
      ids.add(item.id)
    }
  }
  return results
}
