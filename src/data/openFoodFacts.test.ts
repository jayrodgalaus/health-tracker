import { describe, expect, it, vi } from 'vitest'
import { convertOpenFoodFactsProduct, externalFoodUrl, searchOpenFoodFacts } from './openFoodFacts'

const product = {
  code: '3017624010701', product_name: 'Synthetic hazelnut spread', brands: 'Synthetic',
  quantity: '400 g', product_quantity_unit: 'g',
  nutriments: {
    'energy-kcal_100g': 539, 'proteins_100g': 6.6,
    'carbohydrates_100g': 57.5, 'fat_100g': 30.9,
    'saturated-fat_100g': 10.6, 'sugars_100g': 56.3,
    'sodium_100g': 0.042, 'potassium_100g': 0,
  }
}

describe('Open Food Facts label mapping', () => {
  it('preserves original per-100g basis, sodium g→mg, known zeros and unknown fields', () => {
    const result = convertOpenFoodFactsProduct(product, '2026-11-07T03:00:00.000Z')
    expect(result).toMatchObject({
      id: '3017624010701', basisUnit: 'g',
      nutritionSource: { provider: 'open-food-facts', productCode: '3017624010701' },
      nutrients: { energyKcal: 539, proteinG: 6.6, sodiumMg: 42, potassiumMg: 0, fiberG: null }
    })
    expect(externalFoodUrl('3017624010701')).toBe('https://world.openfoodfacts.org/product/3017624010701')
    expect(externalFoodUrl('../bad')).toBeNull()
  })
  it('recognizes clearly labelled volumes without inferring density', () => {
    const liquid = convertOpenFoodFactsProduct({
      ...product, quantity: '330 ml', product_quantity_unit: 'ml'
    }, '2026-11-07T03:00:00.000Z')
    expect(liquid?.basisUnit).toBe('ml')
    expect(convertOpenFoodFactsProduct({
      ...product, quantity: '400 g', product_quantity_unit: undefined
    }, '2026-11-07T03:00:00.000Z')?.basisUnit).toBe('g')
  })
  it('rejects missing identification or nutrition and retains unknown rather than fabricating', () => {
    expect(convertOpenFoodFactsProduct({ ...product, code: 'bad' }, '2026-11-07T03:00:00.000Z')).toBeNull()
    expect(convertOpenFoodFactsProduct({ ...product, nutriments: {} }, '2026-11-07T03:00:00.000Z')).toBeNull()
    const invalid = convertOpenFoodFactsProduct({
      ...product, nutriments: { 'energy-kcal_100g': -10, 'proteins_100g': 3 }
    }, '2026-11-07T03:00:00.000Z')
    expect(invalid?.nutrients.energyKcal).toBeNull()
    expect(invalid?.nutrients.proteinG).toBe(3)
  })
  it('makes one explicit GET with bounded fields and never includes user logs', async () => {
    const requester = vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ products: [product, product] })
    })) as unknown as typeof fetch
    const result = await searchOpenFoodFacts('hazelnut spread', undefined, requester, Date.UTC(2026,10,7,3))
    expect(result).toHaveLength(1)
    const [url, options] = (requester as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const target = new URL(url)
    expect(target.searchParams.get('search_terms')).toBe('hazelnut spread')
    expect(target.searchParams.get('fields')).toContain('nutriments')
    expect(target.searchParams.has('birthDate')).toBe(false)
    expect(options.method).toBe('GET')
    expect(() => externalFoodUrl('javascript:alert(1)')).not.toThrow()
  })
  it('handles upstream errors and missing JSON without changing records', async () => {
    const failed = vi.fn(async () => ({ok: false, status: 429})) as unknown as typeof fetch
    await expect(searchOpenFoodFacts('synthetic food', undefined, failed, Date.UTC(2026,10,7,4)))
      .rejects.toThrow(/rate-limiting/)
    const malformed = vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ data: [] })
    })) as unknown as typeof fetch
    await expect(searchOpenFoodFacts('synthetic label', undefined, malformed, Date.UTC(2026,10,7,5)))
      .rejects.toThrow(/Unexpected/)
    await expect(searchOpenFoodFacts('ab', undefined, malformed)).rejects.toThrow(/3–80/)
  })
})
