import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { KitchenIngredientSnapshot } from '../../domain/models'
import { emptyNutrition } from '../../domain/nutrition'
import { KitchenIngredientShelf } from './KitchenIngredientShelf'
import { KitchenIngredientEditDialog } from './KitchenIngredientEditDialog'

const items: KitchenIngredientSnapshot[] = [
  {name:'Bananas, raw',source:'usda',quantity:100,unit:'g',
    labelBasis:{quantity:100,unit:'g'},nutrientsSnapshot:{...emptyNutrition(),energyKcal:89}},
  {name:'Potatoes, boiled, cooked in skin, without salt',source:'usda',
    quantity:150,unit:'g',labelBasis:{quantity:100,unit:'g'},
    nutrientsSnapshot:{...emptyNutrition(),energyKcal:120}}
]

describe('Kitchen cauldron ingredient shelf',()=>{
  it('renders first-word-only pills while retaining full accessible identities',()=>{
    const html=renderToStaticMarkup(<KitchenIngredientShelf
      ingredients={items} disabled={false} onSelect={()=>{}} />)
    expect(html).toContain('aria-label="Ingredients in cauldron"')
    expect(html).toContain('kitchen-ingredient-scroll h-full')
    expect(html).toContain('>Bananas</span>')
    expect(html).toContain('>Potatoes</span>')
    expect(html).not.toContain('>Bananas, raw</span>')
    expect(html).toContain('aria-label="Edit ingredient Bananas, raw, 100 g"')
    expect(html).toContain('aria-label="Edit ingredient Potatoes, boiled, cooked in skin, without salt, 150 g"')
    expect(html).toContain('tabindex="0"')
  })
  it('makes ingredient pills inert while the cauldron is cooking',()=>{
    const html=renderToStaticMarkup(<KitchenIngredientShelf
      ingredients={items} disabled onSelect={()=>{}} />)
    expect(html).toContain('disabled=""')
  })
  it('opens a focused quantity editor with safe actions and the full name',()=>{
    const html=renderToStaticMarkup(<KitchenIngredientEditDialog
      ingredient={items[1]!} onSave={()=>{}} onRemove={()=>{}} onClose={()=>{}} />)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Potatoes, boiled, cooked in skin, without salt</p>')
    expect(html).toContain('value="150"')
    expect(html).toContain('Save changes')
    expect(html).toContain('Remove ingredient')
    expect(html).toContain('Cancel')
  })
})
