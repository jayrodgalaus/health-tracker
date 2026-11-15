import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { KitchenIngredientSnapshot } from '../../domain/models'
import { emptyNutrition } from '../../domain/nutrition'
import { KitchenSaveDialog } from './KitchenSaveDialog'

const ingredients: KitchenIngredientSnapshot[] = [{
  name:'Synthetic oat',source:'savedFood',quantity:100,unit:'g',
  labelBasis:{quantity:100,unit:'g'},
  nutrientsSnapshot:{...emptyNutrition(),energyKcal:150}
}]

describe('Kitchen save dialog batch semantics', () => {
  it('requires a full measured batch and keeps both serving fields optional', () => {
    const html = renderToStaticMarkup(<KitchenSaveDialog
      ingredients={ingredients}
      nutrients={{...emptyNutrition(),energyKcal:150}}
      incompleteNutrientFields={[]}
      onClose={()=>{}}
      onSave={async()=>{}} />)
    expect(html).toContain('Finished batch amount (')
    expect(html).not.toContain('Finished batch amount (optional')
    expect(html).toMatch(/Finished batch amount \(g\)[\s\S]*?<input[^>]*required=""/)
    expect(html).toContain('Servings (optional)')
    expect(html).toContain('Amount per serving (g)')
    expect(html).toContain('150 kcal')
    expect(html).toContain('Consolidated nutrition')
  })
})
