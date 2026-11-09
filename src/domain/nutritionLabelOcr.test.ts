import { describe,expect,it } from 'vitest'
import { parseNutritionLabelOcr } from './nutritionLabelOcr'

describe('photo label OCR parsing', () => {
  it('preserves per-serving quantities and recognized units',()=>{
    const label = parseNutritionLabelOcr(`Nutrition Facts
Serving Size 30 g
Amount per serving
Calories 140
Total Fat 7g 9%
Saturated Fat 2g 10%
Total Carbohydrate 18g 6%
Dietary Fiber 3g 11%
Total Sugars 4g
Protein 2g
Sodium 310mg 13%
Potassium 80mg 2%`)
    expect(label.basis).toEqual({quantity:30,unit:'g'})
    expect(label.servingDescription).toBe('30 g')
    expect(label.nutrients).toEqual({
      energyKcal:140,fatG:7,saturatedFatG:2,carbohydratesG:18,
      fiberG:3,sugarsG:4,proteinG:2,sodiumMg:310,potassiumMg:80
    })
  })
  it('handles per-100 ml and grams-to-mg conversion without inventing zeros',()=>{
    const result = parseNutritionLabelOcr(`Typical Values per 100 ml
Energy 250 kJ / 60 kcal
Proteins 1.2 g
Sodium 0.2 g`)
    expect(result.basis).toEqual({quantity:100,unit:'ml'})
    expect(result.nutrients).toEqual({energyKcal:60,proteinG:1.2,sodiumMg:200})
    expect(result.nutrients.sugarsG).toBeUndefined()
  })
  it('does not interpret daily-value percentages or unsupported kJ as nutrition',()=>{
    expect(parseNutritionLabelOcr('Energy 390 kJ\nSodium 10%\nProtein 5%').nutrients).toEqual({})
    expect(parseNutritionLabelOcr('Calories 0\nSodium 0mg').nutrients).toEqual({energyKcal:0,sodiumMg:0})
  })
  it('preserves unknown basis and avoids treating salt as sodium',()=>{
    expect(parseNutritionLabelOcr('Calories 90\nSalt 0.2g')).toEqual({
      nutrients:{energyKcal:90},basis:null,servingDescription:null
    })
  })
  it('recognizes serving descriptions without known mass or volume',()=>{
    const x = parseNutritionLabelOcr('Serving Size 2 pieces\nProtein 4 g')
    expect(x.basis).toEqual({quantity:1,unit:'serving'})
    expect(x.servingDescription).toBe('2 pieces')
  })
  it('recognizes a photographed nutrition-table transcription with comma serving size',()=>{
    const result = parseNutritionLabelOcr(`NUTRITION INFORMATION
Serving Size, 56g
Servings per Container, about 3
Amount per Serving % RENI/NRV
Calories 85
Calories from Fat 45
Total Fat 5g
Saturated Fat 1g
Trans Fat 0g
Omega3 591mg
Cholesterol 9mg
Sodium 273mg
Total Carbohydrates 3g
Dietary Fiber 0g
Sugars 3g
Protein 7g
INGREDIENTS: Tuna flakes, water, vegetable oil`)
    expect(result.basis).toEqual({quantity:56,unit:'g'})
    expect(result.nutrients).toEqual({
      energyKcal:85,fatG:5,saturatedFatG:1,sodiumMg:273,
      carbohydratesG:3,fiberG:0,sugarsG:3,proteinG:7
    })
  })
  it('splits several nutrient rows when OCR runs them together',()=>{
    const result = parseNutritionLabelOcr('Nutrition Information Calories 85 Total Fat 5g Protein 7g Sodium 273mg')
    expect(result.nutrients).toEqual({energyKcal:85,fatG:5,proteinG:7,sodiumMg:273})
  })

})
