import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { useToast } from '../components/ToastProvider'
import { saveSavedFood } from '../data/intakeRepository'
import { totalRecipeNutrition } from '../domain/kitchenRecipe'
import type { KitchenIngredientSnapshot } from '../domain/models'
import { KitchenCauldron, type KitchenPhase } from '../features/kitchen/KitchenCauldron'
import { KitchenIngredientPicker } from '../features/kitchen/KitchenIngredientPicker'
import { KitchenSaveDialog, type KitchenSavePayload } from '../features/kitchen/KitchenSaveDialog'

const format = (value: number) => Number(value.toFixed(2)).toLocaleString('en-US')

/** A local-only recipe workspace. Ingredients are written only on Save dish. */
export function KitchenPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [ingredients, setIngredients] = useState<KitchenIngredientSnapshot[]>([])
  const [phase, setPhase] = useState<KitchenPhase>('preparing')
  const [showSave, setShowSave] = useState(false)
  const totals = useMemo(() => ingredients.length
    ? totalRecipeNutrition({ ingredients }) : null, [ingredients])

  useEffect(() => {
    if (phase !== 'cooking') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('ready')
      return
    }
    const timeout = window.setTimeout(() => setPhase('ready'), 1000)
    return () => window.clearTimeout(timeout)
  }, [phase])

  async function save(payload: KitchenSavePayload) {
    if (!totals || !ingredients.length) throw new Error('Add an ingredient before saving.')
    // If the cooked weight/volume is unknown, the complete batch is one
    // "serving" unless the cook explicitly entered a serving count.
    const labelBasis = payload.finishedAmount ??
      { quantity: payload.servingCount ?? 1, unit: 'serving' as const }
    await saveSavedFood({
      name: payload.name,
      kind: payload.kind,
      labelBasis,
      referenceNutrients: totals.nutrients,
      incompleteNutrientFields: totals.incompleteNutrientFields,
      fluidMlPerBasis: payload.kind === 'beverage' && payload.finishedAmount?.unit === 'ml'
        ? payload.finishedAmount.quantity : null,
      recipe: {
        ingredients: structuredClone(ingredients),
        ...(payload.finishedAmount ? { finishedAmount: payload.finishedAmount } : {}),
        ...(payload.servingCount ? { servingCount: payload.servingCount } : {})
      }
    })
    toast.success('Dish saved to your ' + (payload.kind === 'food' ? 'foods.' : 'drinks.'))
    navigate('/log/saved-foods?kind=' + (payload.kind === 'food' ? 'food' : 'drink'))
  }

  return <div className="space-y-5">
    <header><PageTitle topic="kitchen">Kitchen</PageTitle></header>
    <KitchenCauldron phase={phase} onDone={() => setShowSave(true)} />
    <div className="h-3" aria-hidden="true" />

    {ingredients.length > 0 && <section aria-label="Ingredients in cauldron">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold">Ingredients</h2>
        <span className="text-xs font-semibold tabular-nums text-slate-600">{ingredients.length}</span>
      </div>
      <ul className="space-y-2">
        {ingredients.map((item, index) => <li key={index}
          className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <span className="min-w-0 text-sm">
            <strong className="block break-words font-semibold">{item.name}</strong>
            <span className="text-slate-600">{format(item.quantity)} {item.unit}</span>
          </span>
          {phase === 'preparing' && <button type="button" aria-label={'Remove '+item.name}
            onClick={() => setIngredients(items => items.filter((_, i) => i !== index))}
            className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
            Remove
          </button>}
        </li>)}
      </ul>
    </section>}

    {phase === 'preparing' && <KitchenIngredientPicker
      onAdd={ingredient => setIngredients(items => [...items, ingredient])} />}

    {phase !== 'ready' && <button type="button" disabled={!ingredients.length || phase === 'cooking'}
      onClick={() => setPhase('cooking')}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-700 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
      <span aria-hidden="true">🔥</span> {phase === 'cooking' ? 'Cooking…' : 'Start cooking'}
    </button>}

    {showSave && totals && <KitchenSaveDialog ingredients={ingredients}
      nutrients={totals.nutrients} incompleteNutrientFields={totals.incompleteNutrientFields}
      onClose={() => setShowSave(false)} onSave={save} />}
  </div>
}
