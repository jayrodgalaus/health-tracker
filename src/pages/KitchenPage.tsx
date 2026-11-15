import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { useToast } from '../components/ToastProvider'
import { saveSavedFood } from '../data/intakeRepository'
import { totalRecipeNutrition } from '../domain/kitchenRecipe'
import type { KitchenIngredientSnapshot } from '../domain/models'
import { KitchenCauldron, type KitchenPhase } from '../features/kitchen/KitchenCauldron'
import { KitchenIngredientPicker } from '../features/kitchen/KitchenIngredientPicker'
import { KitchenIngredientShelf } from '../features/kitchen/KitchenIngredientShelf'
import { KitchenIngredientEditDialog } from '../features/kitchen/KitchenIngredientEditDialog'
import { KitchenSaveDialog, type KitchenSavePayload } from '../features/kitchen/KitchenSaveDialog'

/** A local-only recipe workspace. Ingredients are written only on Save dish. */
export function KitchenPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [ingredients, setIngredients] = useState<KitchenIngredientSnapshot[]>([])
  const [phase, setPhase] = useState<KitchenPhase>('preparing')
  const [showSave, setShowSave] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
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
    <div className="grid h-[31dvh] min-h-[218px] max-h-[310px] grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-stretch gap-2 sm:gap-5">
      <KitchenIngredientShelf ingredients={ingredients} disabled={phase === 'cooking'}
        onSelect={setEditingIndex} />
      <KitchenCauldron phase={phase} onDone={() => setShowSave(true)} />
    </div>
    <div className="h-3" aria-hidden="true" />

    {phase === 'preparing' && <KitchenIngredientPicker
      onAdd={ingredient => setIngredients(items => [...items, ingredient])} />}

    {phase !== 'ready' && <button type="button" disabled={!ingredients.length || phase === 'cooking'}
      onClick={() => setPhase('cooking')}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-700 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
      <span aria-hidden="true">🔥</span> {phase === 'cooking' ? 'Cooking…' : 'Start cooking'}
    </button>}

    {editingIndex !== null && ingredients[editingIndex] && phase !== 'cooking' &&
      <KitchenIngredientEditDialog key={editingIndex} ingredient={ingredients[editingIndex]}
        onSave={item => {
          setIngredients(previous => previous.map((existing, index) => index === editingIndex ? item : existing))
          setEditingIndex(null)
          if (phase === 'ready') setPhase('preparing')
        }}
        onRemove={() => {
          setIngredients(previous => previous.filter((_, index) => index !== editingIndex))
          setEditingIndex(null)
          if (phase === 'ready') setPhase('preparing')
        }}
        onClose={() => setEditingIndex(null)} />}
    {showSave && totals && <KitchenSaveDialog ingredients={ingredients}
      nutrients={totals.nutrients} incompleteNutrientFields={totals.incompleteNutrientFields}
      onClose={() => setShowSave(false)} onSave={save} />}
  </div>
}
