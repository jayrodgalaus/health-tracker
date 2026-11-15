import type { KitchenIngredientSnapshot } from '../../domain/models'
import { kitchenIngredientPillLabel } from './kitchenIngredient'

/** Compact scrollable ingredient pills sit alongside the cauldron. */
export function KitchenIngredientShelf({
  ingredients, disabled, onSelect
}: {
  ingredients: readonly KitchenIngredientSnapshot[]
  disabled: boolean
  onSelect: (index: number) => void
}) {
  return <section aria-label="Ingredients in cauldron"
    className="kitchen-ingredient-scroll h-full min-w-0 overflow-y-auto overscroll-contain py-2 pr-1 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-700"
    tabIndex={0}>
    <ul className="flex flex-wrap content-start items-start gap-1.5 sm:gap-2">
      {ingredients.map((ingredient, index) => <li key={index} className="min-w-0 max-w-full">
        <button type="button" disabled={disabled}
          aria-label={'Edit ingredient ' + ingredient.name + ', ' + ingredient.quantity + ' ' + ingredient.unit}
          title={ingredient.name + ' · ' + ingredient.quantity + ' ' + ingredient.unit}
          onClick={() => onSelect(index)}
          className="inline-flex min-h-9 max-w-full items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-evergreen-700 shadow-sm transition-colors hover:border-evergreen-600 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-700 disabled:cursor-default disabled:opacity-60 sm:text-sm">
          <span className="block truncate">{kitchenIngredientPillLabel(ingredient.name)}</span>
        </button>
      </li>)}
    </ul>
  </section>
}
