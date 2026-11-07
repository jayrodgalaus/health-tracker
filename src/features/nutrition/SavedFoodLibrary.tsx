import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SavedFood, ServingUnit } from '../../domain/models'
import { deleteSavedFood, listSavedFoods, saveSavedFood } from '../../data/intakeRepository'
import { NutritionFields, inputsFromNutrition, nutritionFromInputs, parseNumber } from './NutritionFields'
import { basisFor, inferBasisMode, SERVING_UNITS, type BasisMode } from './labelBasis'

const fieldClass = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

function SavedFoodEditor({ editing, onDone, onCancel }: { editing?: SavedFood; onDone: () => void; onCancel: () => void }) {
  const basis = editing?.labelBasis ?? { quantity: 1, unit: 'serving' as const }
  const [name, setName] = useState(editing?.name ?? '')
  const [brand, setBrand] = useState(editing?.brand ?? '')
  const [kind, setKind] = useState<'food' | 'beverage'>(editing?.kind ?? 'food')
  const [mode, setMode] = useState<BasisMode>(inferBasisMode(basis))
  const [quantity, setQuantity] = useState(String(basis.quantity))
  const [unit, setUnit] = useState<ServingUnit>(basis.unit)
  const [servingDescription, setServingDescription] = useState(editing?.servingDescription ?? '')
  const [fluid, setFluid] = useState(editing?.fluidMlPerBasis == null ? '' : String(editing.fluidMlPerBasis))
  const [isFavorite, setIsFavorite] = useState(editing?.isFavorite ?? false)
  const [nutrition, setNutrition] = useState(inputsFromNutrition(editing?.nutrientsPerBasis))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function changeMode(next: BasisMode) {
    const nextBasis = basisFor(next, quantity, unit)
    setMode(next)
    setQuantity(String(nextBasis.quantity))
    setUnit(nextBasis.unit)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const reference = basisFor(mode, quantity, unit)
      await saveSavedFood({
        name, brand, kind, servingDescription, labelBasis: reference,
        referenceNutrients: nutritionFromInputs(nutrition),
        fluidMlPerBasis: kind === 'beverage' && reference.unit !== 'ml' && reference.unit !== 'fl-oz'
          ? parseNumber(fluid, 'fluid volume per label basis', true)
          : kind === 'beverage' ? reference.quantity * (reference.unit === 'fl-oz' ? 29.5735295625 : 1) : null,
        isFavorite
      }, editing?.id)
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save reusable label.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={event => { void submit(event) }} noValidate className="space-y-4 rounded-2xl border border-evergreen-100 bg-white p-4">
      <h3 className="text-lg font-bold">{editing ? 'Edit reusable label' : 'Create reusable label'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block text-sm font-medium">Product name
          <input className={fieldClass} maxLength={150} value={name} onChange={event => setName(event.target.value)} required />
        </label>
        <label className="block text-sm font-medium">Brand (optional)
          <input className={fieldClass} maxLength={150} value={brand} onChange={event => setBrand(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Type
          <select aria-label="Product type" className={fieldClass} value={kind} onChange={event => setKind(event.target.value as 'food' | 'beverage')}>
            <option value="food">Food</option><option value="beverage">Drink</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Label values per
          <select className={fieldClass} value={mode} onChange={event => changeMode(event.target.value as BasisMode)}>
            <option value="serving">1 serving</option><option value="piece">1 piece</option>
            <option value="100g">100 g</option><option value="100ml">100 ml</option>
            <option value="custom">Other label quantity</option>
          </select>
        </label>
        {mode === 'custom' && <>
          <label className="block text-sm font-medium">Reference amount
            <input className={fieldClass} type="number" step="any" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium">Reference unit
            <select className={fieldClass} value={unit} onChange={event => setUnit(event.target.value as ServingUnit)}>
              {SERVING_UNITS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </>}
        <label className="col-span-2 block text-sm font-medium">Serving description (optional)
          <input className={fieldClass} maxLength={150} value={servingDescription} onChange={event => setServingDescription(event.target.value)} placeholder="e.g. 2 biscuits" />
        </label>
        {kind === 'beverage' && mode !== '100ml' && mode !== 'custom' && <label className="col-span-2 block text-sm font-medium">Fluid volume per reference portion (ml)
          <input className={fieldClass} type="number" step="any" inputMode="decimal" value={fluid} onChange={event => setFluid(event.target.value)} placeholder="Unknown" />
        </label>}
        {kind === 'beverage' && mode === 'custom' && unit !== 'ml' && unit !== 'fl-oz' && <label className="col-span-2 block text-sm font-medium">Fluid volume per reference portion (ml)
          <input className={fieldClass} type="number" step="any" inputMode="decimal" value={fluid} onChange={event => setFluid(event.target.value)} placeholder="Unknown" />
        </label>}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isFavorite} onChange={event => setIsFavorite(event.target.checked)} />
        Add to favorites
      </label>
      <NutritionFields values={nutrition} onChange={(field, value) => setNutrition(previous => ({ ...previous, [field]: value }))} legend="Nutrition per label basis" />
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={saving}>{saving ? 'Saving…' : 'Save label'}</button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  )
}

export function SavedFoodLibrary({ onUse }: { onUse: (food: SavedFood) => void }) {
  const saved = useLiveQuery(() => listSavedFoods(), [], undefined)
  const [editing, setEditing] = useState<SavedFood | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function remove(id: string) {
    setError('')
    try {
      await deleteSavedFood(id)
      setDeleting(null)
      setNotice('Reusable product removed. Historical log entries were not changed.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove reusable label.')
    }
  }

  return (
    <section aria-labelledby="saved-foods-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="saved-foods-title" className="text-lg font-bold">Saved food and drink labels</h2>
        </div>
        <button type="button" onClick={() => { setEditing(null); setAdding(true) }} className="min-h-11 rounded-xl border border-evergreen-600 px-4 text-sm font-semibold text-evergreen-700">+ Save a label</button>
      </div>
      {(editing || adding) && <SavedFoodEditor key={editing?.id ?? 'new'} editing={editing ?? undefined}
        onDone={() => { setEditing(null); setAdding(false); setNotice('Label saved locally.') }}
        onCancel={() => { setEditing(null); setAdding(false) }} />}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {notice && <p role="status" className="text-sm text-evergreen-700">{notice}</p>}
      {saved === undefined && <p role="status" className="text-sm text-slate-600">Loading saved labels…</p>}
      {saved?.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">No products saved yet. Create one from a food label to log it again in a few taps.</p>}
      <div className="space-y-2">
        {saved?.map(item => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.isFavorite ? '★ ' : ''}{item.name}</h3>
                <p className="text-xs text-slate-600">{item.brand ? `${item.brand} · ` : ''}{item.kind === 'beverage' ? 'Drink' : 'Food'} · per {item.labelBasis.quantity} {item.labelBasis.unit}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onUse(item)} className="min-h-11 rounded-xl bg-evergreen-600 px-4 text-sm font-semibold text-white">Log this</button>
              <button type="button" onClick={() => { setEditing(item); setAdding(false); setNotice('') }} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Edit label</button>
              <button type="button" onClick={() => setDeleting(item.id)} className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-800">Remove</button>
            </div>
            {deleting === item.id && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
              <p>Remove this reusable label? Already logged items retain their original snapshots.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="min-h-11 rounded-lg bg-rose-700 px-4 font-semibold text-white" onClick={() => { void remove(item.id) }}>Confirm remove</button>
                <button type="button" className="min-h-11 rounded-lg border border-slate-300 px-4" onClick={() => setDeleting(null)}>Cancel</button>
              </div>
            </div>}
          </article>
        ))}
      </div>
    </section>
  )
}
