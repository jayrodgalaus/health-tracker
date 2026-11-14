import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { KitchenIngredientSnapshot, NutrientSnapshot } from '../../domain/models'
import { perServingAmount, servingsForAmount } from '../../domain/kitchenRecipe'
import { NUTRIENT_FIELDS } from '../../domain/nutrition'
import { NUTRIENT_LABELS } from '../nutrition/NutritionFields'

export interface KitchenSavePayload {
  name: string
  kind: 'food' | 'beverage'
  finishedAmount: { quantity: number; unit: 'g' | 'ml' } | null
  servingCount: number | null
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const input = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'
const isPositive = (value: number) => Number.isFinite(value) && value > 0 && value <= 10000

export function KitchenNutritionList({
  nutrients, incompleteNutrientFields
}: {
  nutrients: NutrientSnapshot
  incompleteNutrientFields: readonly (keyof NutrientSnapshot)[]
}) {
  return <dl aria-label="Consolidated nutrition" className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-3">
    {NUTRIENT_FIELDS.map(field => {
      const value = nutrients[field]
      const partial = incompleteNutrientFields.includes(field)
      const units = field === 'energyKcal' ? 'kcal' : field === 'sodiumMg' || field === 'potassiumMg' ? 'mg' : 'g'
      return <div key={field} className="flex items-center justify-between gap-2 py-2 text-sm">
        <dt className="font-medium text-slate-700">{NUTRIENT_LABELS[field]}</dt>
        <dd className="text-right font-semibold tabular-nums">
          {value == null ? '—' : (partial ? '+≈ ' : '') + numberFormat.format(value) + ' ' + units}
        </dd>
      </div>
    })}
  </dl>
}

export function KitchenSaveDialog({
  ingredients, nutrients, incompleteNutrientFields, onClose, onSave
}: {
  ingredients: readonly KitchenIngredientSnapshot[]
  nutrients: NutrientSnapshot
  incompleteNutrientFields: readonly (keyof NutrientSnapshot)[]
  onClose: () => void
  onSave: (payload: KitchenSavePayload) => Promise<void>
}) {
  const heading = 'Name your dish'
  const field = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLFormElement>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'food' | 'beverage'>('food')
  const [amount, setAmount] = useState('')
  const [servings, setServings] = useState('')
  const [perServing, setPerServing] = useState('')
  const [lastEdited, setLastEdited] = useState<'count' | 'size'>('count')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { field.current?.focus() }, [])
  // Esc closes and Tab remains inside the modal (including its cancel control).
  function keys(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape' && !saving) { event.preventDefault(); onClose() }
    if (event.key !== 'Tab' || !panel.current) return
    const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled])'
    ))
    if (!focusable.length) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const total = Number(amount)
  const hasAmount = amount.trim() !== '' && isPositive(total)
  const count = Number(servings)
  const size = Number(perServing)
  const resolvedCount = !hasAmount ? count
    : lastEdited === 'size' && perServing.trim() !== '' && isPositive(size)
      ? servingsForAmount({ quantity: total, unit: kind === 'food' ? 'g' : 'ml' },
        { quantity: size, unit: kind === 'food' ? 'g' : 'ml' }) ?? 0
      : count
  const resolvedSize = hasAmount && lastEdited === 'count' && servings.trim() !== '' && isPositive(count)
    ? perServingAmount({quantity: total, unit: kind === 'food' ? 'g' : 'ml'}, count)?.quantity ?? 0
    : size

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!name.trim()) { setError('Enter a dish name.'); field.current?.focus(); return }
    if (amount.trim() && !isPositive(total)) { setError('Enter a valid finished amount.'); return }
    const hasCount = servings.trim() !== '' || (hasAmount && lastEdited === 'size' && perServing.trim() !== '')
    if (hasCount && !isPositive(resolvedCount)) { setError('Enter a valid number of servings.'); return }
    if (perServing.trim() !== '' && (!hasAmount || !isPositive(resolvedSize))) {
      setError('Enter a finished amount before setting the amount per serving.'); return
    }
    const payload: KitchenSavePayload = {
      name: name.trim(), kind,
      finishedAmount: hasAmount ? { quantity: total, unit: kind === 'food' ? 'g' : 'ml' } : null,
      servingCount: hasCount ? resolvedCount : null
    }
    setSaving(true)
    try { await onSave(payload) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your dish.') }
    finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/65 px-0 py-0 sm:items-center sm:p-5"
    role="presentation">
    <form ref={panel} role="dialog" aria-modal="true" aria-label={heading}
      onSubmit={event => { void submit(event) }} onKeyDown={keys}
      className="max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold" id="kitchen-dialog-title">{heading}</h2>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close save dish dialog"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-600 hover:bg-slate-100">×</button>
      </div>
      <label className="block text-sm font-semibold">Dish name
        <input ref={field} className={input} maxLength={150} value={name} required
          onChange={event => setName(event.target.value)} autoComplete="off" />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Save as</legend>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-evergreen-600">
          {([{value:'food',label:'Food'},{value:'beverage',label:'Drink'}] as const).map(item=>
            <label key={item.value} className={'flex min-h-11 items-center justify-center font-semibold ' +
              (kind === item.value ? 'bg-evergreen-600 text-white' : 'bg-white text-evergreen-700')}>
              <input type="radio" className="sr-only" name="kitchen-kind" value={item.value}
                checked={kind === item.value} onChange={() => {
                  setKind(item.value); setAmount(''); setServings(''); setPerServing(''); setLastEdited('count')
                }} />
              {item.label}
            </label>)}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block text-sm font-semibold">
          Finished batch amount (optional, {kind === 'food' ? 'g' : 'mL'})
          <input className={input} type="number" step="any" min="0.000001" max="10000"
            inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Servings (optional)
          <input className={input} type="number" step="any" min="0.000001" max="10000"
            inputMode="decimal"
            value={hasAmount && lastEdited === 'size' && perServing.trim() !== '' && isPositive(size)
              ? String(Number(resolvedCount.toFixed(5))) : servings}
            onChange={event => { setServings(event.target.value); setLastEdited('count') }} />
        </label>
        <label className="block text-sm font-semibold">Amount per serving ({kind === 'food' ? 'g' : 'mL'})
          <input className={input} type="number" step="any" min="0.000001" max="10000"
            inputMode="decimal" value={hasAmount && lastEdited === 'count' && servings.trim() !== '' && isPositive(count)
              ? String(Number(resolvedSize.toFixed(5))) : perServing}
            onChange={event => { setPerServing(event.target.value); setLastEdited('size') }} />
        </label>
      </div>
      <div>
        <h3 className="mb-2 text-base font-bold">Consolidated nutrition</h3>
        <KitchenNutritionList nutrients={nutrients} incompleteNutrientFields={incompleteNutrientFields} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <button type="submit" disabled={saving || ingredients.length === 0}
        className="min-h-12 w-full rounded-2xl bg-evergreen-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-evergreen-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save dish'}
      </button>
    </form>
  </div>
}
