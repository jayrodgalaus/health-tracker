import { describe, expect, it } from 'vitest'
import type { IngredientFood } from '../../data/ingredientCatalog'
import type { SavedFood } from '../../domain/models'
import { emptyNutrition } from '../../domain/nutrition'
import { prepareKitchenIngredient } from './kitchenIngredient'

const now='2026-11-07T09:00:00.000Z'
const saved: SavedFood = {
  id:'sample',name:'Synthetic milk',brand:null,kind:'beverage',
  labelBasis:{quantity:100,unit:'ml'},
  nutrientsPerBasis:{...emptyNutrition(),energyKcal:65,proteinG:4},
  incompleteNutrientFields:['proteinG'],fluidMlPerBasis:100,
  createdAt:now,updatedAt:now
}
const usda: IngredientFood = {
  id:169976,name:'Synthetic rice',group:'Rice',preparation:'raw',
  basisUnit:'g',servingDescription:null,
  nutritionSource:{provider:'usda-sr-legacy',fdcId:169976,release:'2018-04'},
  nutrients:{...emptyNutrition(),energyKcal:360}
}
describe('Kitchen ingredient builder',()=>{
  it('scales saved drinks and preserves partial data and fluid without double-counting',()=>{
    const item=prepareKitchenIngredient({type:'saved',item:saved},250,'ml')
    expect(item.nutrientsSnapshot.energyKcal).toBe(162.5)
    expect(item.nutrientsSnapshot.proteinG).toBe(10)
    expect(item.incompleteNutrientFields).toEqual(['proteinG'])
    expect(item.fluidMl).toBe(250)
    expect(item.source).toBe('savedDrink')
  })
  it('retains immutable USDA identity and source nutrition while converting mass',()=>{
    const item=prepareKitchenIngredient({type:'usda',item:usda},50,'g')
    expect(item.nutritionSource).toEqual(usda.nutritionSource)
    expect(item.nutrientsSnapshot.energyKcal).toBe(180)
    expect(item.labelBasis).toEqual({quantity:100,unit:'g'})
    expect(()=>prepareKitchenIngredient({type:'usda',item:usda},50,'ml')).toThrow(/Cannot convert/)
  })
  it('treats plain water as known zero calories with actual fluid volume',()=>{
    const item=prepareKitchenIngredient({type:'water'},240,'ml')
    expect(item.source).toBe('plainWater')
    expect(item.nutrientsSnapshot.energyKcal).toBe(0)
    expect(item.fluidMl).toBe(240)
    expect(()=>prepareKitchenIngredient({type:'water'},1,'piece')).toThrow(/Cannot convert/)
  })
})
