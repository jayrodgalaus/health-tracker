import { describe, expect, it } from 'vitest'
import { scaleNutrition } from '../domain/nutrition'
import { searchIngredientCatalog, usdaFoodUrl } from './ingredientCatalog'

describe('bundled USDA ingredient preparation reference', () => {
  it('includes traceable raw and boiled cabbage as distinct measured USDA records', async () => {
    const items = await searchIngredientCatalog('cabbage')
    const raw = items.find(item => item.id === 169975)
    const boiled = items.find(item => item.id === 169976)
    expect(raw?.name).toBe('Cabbage, raw')
    expect(raw?.nutrients.energyKcal).toBe(25)
    expect(boiled?.name).toBe('Cabbage, cooked, boiled, drained, without salt')
    expect(boiled?.nutrients).toMatchObject({
      energyKcal: 23, proteinG: 1.27, carbohydratesG: 5.51,
      fatG: 0.06, fiberG: 1.9, sodiumMg: 8, potassiumMg: 196
    })
    expect(boiled?.nutritionSource).toEqual({
      provider:'usda-sr-legacy',fdcId:169976,release:'2018-04'
    })
    expect(usdaFoodUrl(169976)).toBe('https://fdc.nal.usda.gov/food-details/169976/nutrients')
    expect(usdaFoodUrl(-20)).toBeNull()
    const portion = scaleNutrition(boiled!.nutrients, {quantity:100,unit:'g'},75,'g')
    expect(portion.energyKcal).toBe(17.25)
    expect(portion.sodiumMg).toBe(6)
  })

  it('exposes cooked white and brown rice as separate choices rather than inventing one rice value', async () => {
    const all = await searchIngredientCatalog('rice')
    const brown = all.find(item => item.id === 169704)
    const white = all.find(item => item.id === 168878)
    expect(brown?.name).toContain('brown, long-grain, cooked')
    expect(white?.name).toContain('white, long-grain, regular, enriched, cooked')
    expect(brown?.nutrients.energyKcal).toBe(123)
    expect(white?.nutrients.energyKcal).toBe(130)
    expect(brown?.nutrients.carbohydratesG).toBe(25.58)
    expect(white?.nutrients.carbohydratesG).toBe(28.17)
  })

  it('treats blanched as a search aid, not a fabricated nutrition measurement', async () => {
    const matches = await searchIngredientCatalog('blanched cabbage')
    expect(matches.some(item => item.id === 169976)).toBe(true)
    expect(matches.every(item => !item.name.toLowerCase().includes('blanched'))).toBe(true)
    expect(await searchIngredientCatalog('')).toEqual([])
    expect(await searchIngredientCatalog('unfindable-special-ingredient-zzzz')).toEqual([])
  })

  it('finds authentic USDA red raw onion through red and purple names without inventing sautéed results', async () => {
    for (const query of ['red onion', 'purple onion', 'purple onions', 'onion red']) {
      const items = await searchIngredientCatalog(query)
      const red = items.find(item => item.id === 790577)
      expect(red?.name).toBe('Onions, red, raw')
      expect(red?.nutritionSource).toEqual({provider:'usda-foundation',fdcId:790577,release:'2026-04'})
      expect(red?.nutrients).toMatchObject({
        energyKcal:44, proteinG:0.94, carbohydratesG:9.93, fatG:0.1,
        fiberG:2.2, sodiumMg:1, potassiumMg:197, saturatedFatG:null, sugarsG:null
      })
    }
    const allOnions=await searchIngredientCatalog('onion')
    expect(allOnions.some(item => item.id===790577)).toBe(true)
    expect(allOnions.some(item => item.id===170000)).toBe(true)
    expect(allOnions.some(item => item.id===170004)).toBe(true)
    expect((await searchIngredientCatalog('purple onion sauteed')).length).toBe(0)
    const red=(await searchIngredientCatalog('purple onion'))[0]!
    const portion=scaleNutrition(red.nutrients,{quantity:100,unit:'g'},75,'g')
    expect(portion.energyKcal).toBe(33)
    expect(portion.sugarsG).toBeNull()
  })

  it('keeps unknown reference fields null rather than treating them as measured zeros', async () => {
    const mediumBrownRice = (await searchIngredientCatalog('rice brown')).find(item => item.id === 168875)
    expect(mediumBrownRice?.nutrients.sugarsG).toBeNull()
    const portion = scaleNutrition(mediumBrownRice!.nutrients, {quantity:100,unit:'g'},50,'g')
    expect(portion.sugarsG).toBeNull()
    expect(portion.energyKcal).toBe(56)
  })
})
