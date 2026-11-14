import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { FoodEntry } from '../../domain/models'
import { emptyNutrition } from '../../domain/nutrition'
import { NutritionSummary } from './NutritionSummary'

const now='2026-11-07T08:00:00.000Z'
function entry(id: string, protein: number | null, incomplete = false): FoodEntry {
  return {
    id,dayKey:'2026-11-07',recordedAt:now,createdAt:now,updatedAt:now,
    kind:'food',name:'Synthetic recipe '+id,savedFoodId:null,quantity:1,unit:'serving',
    labelBasis:{quantity:1,unit:'serving'},
    nutrientsSnapshot:{...emptyNutrition(),energyKcal:150,proteinG:protein},
    ...(incomplete?{incompleteNutrientFields:['proteinG' as const]}:{}),
    fluidMl:null
  }
}

describe('provisional nutrition display',()=>{
  it('displays +≈ for known nutrient subtotals but leaves wholly unknown as —',()=>{
    const html=renderToStaticMarkup(<MemoryRouter>
      <NutritionSummary entries={[entry('known',10,true),entry('unknown',null)]} />
    </MemoryRouter>)
    expect(html).toContain('+≈ 10 g')
    expect(html).toContain('300 kcal')
    expect(html).not.toContain('+≈ 300 kcal')
    expect(html).toContain('Protein')
  })
})
