import { useId, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SavedFood, ServingUnit } from '../../domain/models'
import { deleteSavedFood, listSavedFoods, saveSavedFood } from '../../data/intakeRepository'
import { NutritionFields, inputsFromNutrition, nutritionFromInputs, parseNumber } from './NutritionFields'
import { basisFor, inferBasisMode, SERVING_UNITS, type BasisMode } from './labelBasis'
import { useToast } from '../../components/ToastProvider'
import type { ParsedNutritionLabel } from '../../domain/nutritionLabelOcr'

const fieldClass = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

type SavedKind = 'food' | 'beverage'

function SavedFoodEditor({ editing, initialKind, scanned, onDone, onCancel }: {
  editing?: SavedFood
  initialKind: SavedKind
  scanned?: ParsedNutritionLabel
  onDone: (kind: SavedKind) => void
  onCancel: () => void
}) {
  const basis = editing?.labelBasis ?? scanned?.basis ?? { quantity: 1, unit: 'serving' as const }
  const [name, setName] = useState(editing?.name ?? '')
  const [brand, setBrand] = useState(editing?.brand ?? '')
  const [kind, setKind] = useState<SavedKind>(editing?.kind ?? initialKind)
  const [mode, setMode] = useState<BasisMode>(scanned && !scanned.basis ? 'custom' : inferBasisMode(basis))
  const [quantity, setQuantity] = useState(scanned && !scanned.basis ? '' : String(basis.quantity))
  const [unit, setUnit] = useState<ServingUnit>(basis.unit)
  const [servingDescription, setServingDescription] = useState(editing?.servingDescription ?? scanned?.servingDescription ?? '')
  const [fluid, setFluid] = useState(editing?.fluidMlPerBasis == null ? '' : String(editing.fluidMlPerBasis))
  const [isFavorite, setIsFavorite] = useState(editing?.isFavorite ?? false)
  const [nutrition, setNutrition] = useState(() => {
    const values = inputsFromNutrition(editing?.nutrientsPerBasis)
    if (scanned) for (const key of Object.keys(values) as Array<keyof typeof values>) {
      const value = scanned.nutrients[key]
      values[key] = value == null ? '' : String(value)
    }
    return values
  })
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
      onDone(kind)
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
  const toast = useToast()
  const saved = useLiveQuery(() => listSavedFoods(), [], undefined)
  const [editing, setEditing] = useState<SavedFood | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeKind, setActiveKind] = useState<SavedKind>('food')
  const tabsId = useId()
  const foods = saved?.filter(item => (item.kind ?? 'food') === 'food')
  const drinks = saved?.filter(item => item.kind === 'beverage')
  const visible = activeKind === 'food' ? foods : drinks

  function chooseTab(kind: SavedKind) {
    setActiveKind(kind)
    setEditing(null)
    setAdding(false)
    setDeleting(null)
    setError('')
  }

  async function remove(id: string) {
    setError('')
    try {
      await deleteSavedFood(id)
      setDeleting(null)
      toast.success('Saved label removed. Existing logs are unchanged.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove reusable label.')
    }
  }

  return (
    <section aria-label="Saved labels" className="space-y-5">
      <div role="tablist" aria-label="Saved item categories"
        className="grid grid-cols-2 overflow-hidden rounded-full border-2 border-evergreen-600 bg-evergreen-50">
        {([
          { kind: 'food', label: 'Foods', count: foods?.length },
          { kind: 'beverage', label: 'Drinks', count: drinks?.length }
        ] as const).map(tab => (
          <button type="button" role="tab" key={tab.kind}
            id={tabsId + '-' + tab.kind + '-tab'}
            aria-selected={activeKind === tab.kind}
            aria-controls={tabsId + '-panel'}
            onClick={() => chooseTab(tab.kind)}
            className={'flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700 ' +
              (activeKind === tab.kind
                ? 'bg-evergreen-600 text-white shadow-sm'
                : 'text-evergreen-700 hover:bg-evergreen-100')}>
            {tab.label}
            {tab.count !== undefined && <span aria-hidden="true"
              className={'rounded-full px-2 py-0.5 text-xs tabular-nums ' +
                (activeKind === tab.kind ? 'bg-white/20 text-white' : 'bg-white text-evergreen-700')}>
              {tab.count}
            </span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={tabsId + '-panel'}
        aria-labelledby={tabsId + '-' + activeKind + '-tab'}
        className="space-y-4">
        <div className="flex justify-end">
          <button type="button"
            onClick={() => { setEditing(null); setAdding(true); setDeleting(null); setError('') }}
            className="min-h-11 rounded-xl border border-evergreen-600 bg-white px-4 text-sm font-semibold text-evergreen-700">
            + Save a {activeKind === 'food' ? 'food' : 'drink'}
          </button>
        </div>
        {(editing || adding) && <SavedFoodEditor key={editing?.id ?? 'new-' + activeKind}
          editing={editing ?? undefined} initialKind={activeKind}
          onDone={kind => {
            setEditing(null)
            setAdding(false)
            setActiveKind(kind)
            toast.success('Label saved.')
          }}
          onCancel={() => { setEditing(null); setAdding(false) }} />}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        {saved === undefined && <p role="status" className="text-sm text-slate-600">Loading saved labels…</p>}
        {saved !== undefined && visible?.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {activeKind === 'food' ? 'No saved foods yet.' : 'No saved drinks yet.'}
          </p>
        )}
        <div className="space-y-3">
          {visible?.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold">{item.isFavorite ? '★ ' : ''}{item.name}</h2>
              <p className="mt-1 text-xs text-slate-600">
                {item.brand ? item.brand + ' · ' : ''}per {item.labelBasis.quantity} {item.labelBasis.unit}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onUse(item)}
                  className="min-h-11 rounded-xl bg-evergreen-600 px-4 text-sm font-semibold text-white">Log this</button>
                <button type="button"
                  onClick={() => { setEditing(item); setAdding(false); setDeleting(null) }}
                  className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Edit label</button>
                <button type="button" onClick={() => setDeleting(item.id)}
                  className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-800">Remove</button>
              </div>
              {deleting === item.id && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
                <p>Remove this reusable label? Already logged items retain their original snapshots.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="min-h-11 rounded-lg bg-rose-700 px-4 font-semibold text-white"
                    onClick={() => { void remove(item.id) }}>Confirm remove</button>
                  <button type="button" className="min-h-11 rounded-lg border border-slate-300 px-4"
                    onClick={() => setDeleting(null)}>Cancel</button>
                </div>
              </div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
