import { useState, type FormEvent } from 'react'
import type { FoodEntry, MealCategory, NutrientSnapshot, SavedFood, ServingUnit } from '../../domain/models'
import { portionRatio, referenceNutritionForEntry } from '../../domain/nutrition'
import { saveIntake } from '../../data/intakeRepository'
import { toLocalDay } from '../../lib/localDate'
import { basisFor, inferBasisMode, SERVING_UNITS, type BasisMode } from './labelBasis'
import { NutritionFields, inputsFromNutrition, nutritionFromInputs, parseNumber } from './NutritionFields'

const input = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'
interface Props {
  dayKey: string
  kind: 'food' | 'beverage'
  editing?: FoodEntry
  saved?: SavedFood
  recent?: FoodEntry
  onDone: () => void
  onCancel: () => void
}

export function FoodEntryForm({ dayKey, kind, editing, saved, recent, onDone, onCancel }: Props) {
  const source = editing ?? recent
  const reference = source ? referenceNutritionForEntry(source) : saved?.nutrientsPerBasis
  const initialBasis = source?.labelBasis ?? saved?.labelBasis ?? { quantity: 1, unit: 'serving' as const }
  const initialMode = inferBasisMode(initialBasis)
  const [name, setName] = useState(source?.name ?? saved?.name ?? '')
  const [meal, setMeal] = useState<MealCategory | ''>(source?.meal ?? '')
  const [date, setDate] = useState(dayKey)
  const [mode, setMode] = useState<BasisMode>(initialMode)
  const [basisQuantity, setBasisQuantity] = useState(String(initialBasis.quantity))
  const [basisUnit, setBasisUnit] = useState<ServingUnit>(initialBasis.unit)
  const [quantity, setQuantity] = useState(String(source?.quantity ?? (initialMode === '100g' || initialMode === '100ml' ? 100 : initialBasis.quantity)))
  const [unit, setUnit] = useState<ServingUnit>(source?.unit ?? initialBasis.unit)
  const [servingDescription, setServingDescription] = useState(source?.servingDescription ?? saved?.servingDescription ?? '')
  const [nutrition, setNutrition] = useState(inputsFromNutrition(reference))
  const [fluid, setFluid] = useState(source?.fluidMl == null ? '' : String(source.fluidMl))
  const [fluidChanged, setFluidChanged] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const basis = basisFor(mode, basisQuantity, basisUnit)
  const compatibleUnits: ServingUnit[] = basis.unit === 'g' || basis.unit === 'oz' ? ['g', 'oz'] :
    basis.unit === 'ml' || basis.unit === 'fl-oz' ? ['ml', 'fl-oz'] : [basis.unit]
  const effectiveUnit = compatibleUnits.includes(unit) ? unit : basis.unit

  function changeMode(next: BasisMode) {
    const nextBasis = basisFor(next, basisQuantity, basisUnit)
    setMode(next)
    setBasisUnit(nextBasis.unit)
    setBasisQuantity(String(nextBasis.quantity))
    setUnit(nextBasis.unit)
    setQuantity(String(nextBasis.quantity))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const amount = parseNumber(quantity, 'consumed amount')!
      const resolvedBasis = basisFor(mode, basisQuantity, basisUnit)
      if (mode === 'custom') parseNumber(basisQuantity, 'label reference quantity')
      const referenceNutrients: NutrientSnapshot = nutritionFromInputs(nutrition)
      let fluidMl: number | null = null
      if (kind === 'beverage' && effectiveUnit !== 'ml' && effectiveUnit !== 'fl-oz') {
        if (fluidChanged) {
          fluidMl = parseNumber(fluid, 'drink fluid volume', true)
        } else if (source?.fluidMl != null) {
          fluidMl = source.fluidMl * portionRatio(resolvedBasis, amount, effectiveUnit) /
            portionRatio(source.labelBasis, source.quantity, source.unit)
        } else if (saved?.fluidMlPerBasis != null) {
          fluidMl = saved.fluidMlPerBasis * portionRatio(resolvedBasis, amount, effectiveUnit)
        }
      }
      await saveIntake({
        dayKey: date, kind,
        name, meal: kind === 'food' ? meal || null : null,
        savedFoodId: editing?.savedFoodId ?? saved?.id ?? recent?.savedFoodId ?? null,
        quantity: amount, unit: effectiveUnit, labelBasis: resolvedBasis,
        servingDescription,
        referenceNutrients, fluidMl
      }, editing?.id)
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Entry could not be saved. Check local storage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={event => { void submit(event) }} noValidate className="space-y-4 rounded-2xl border border-evergreen-100 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h3 className="text-lg font-bold">{editing ? 'Edit recorded entry' : saved ? 'Log saved label' : recent ? 'Repeat a recent entry' : kind === 'food' ? 'Add food' : 'Add drink'}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">Nutrition values refer to the label basis below. The saved log keeps its own copy even if you later edit the reusable product.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Name
          <input className={input} maxLength={150} value={name} onChange={event => setName(event.target.value)} placeholder={kind === 'food' ? 'Food or meal name' : 'Drink name'} required />
        </label>
        <label className="block text-sm font-medium">Local log date
          <input className={input} type="date" max={toLocalDay(new Date())} value={date} onChange={event => setDate(event.target.value)} required />
        </label>
        {kind === 'food' && <label className="block text-sm font-medium">Meal (optional)
          <select className={input} value={meal} onChange={event => setMeal(event.target.value as MealCategory | '')}>
            <option value="">Not specified</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option><option value="snack">Snack</option>
          </select>
        </label>}
        <label className="block text-sm font-medium">Nutrition is per
          <select className={input} value={mode} onChange={event => changeMode(event.target.value as BasisMode)}>
            <option value="serving">1 serving</option><option value="piece">1 piece</option>
            <option value="100g">100 g</option><option value="100ml">100 ml</option>
            <option value="custom">Custom label quantity</option>
          </select>
        </label>
        {mode === 'custom' && <>
          <label className="block text-sm font-medium">Label quantity
            <input className={input} type="number" step="any" min="0.01" inputMode="decimal" value={basisQuantity} onChange={event => setBasisQuantity(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium">Label unit
            <select className={input} value={basisUnit} onChange={event => { setBasisUnit(event.target.value as ServingUnit); setUnit(event.target.value as ServingUnit) }}>
              {SERVING_UNITS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </>}
        <label className="block text-sm font-medium">Amount consumed
          <input className={input} type="number" step="any" min="0.01" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} required />
        </label>
        <label className="block text-sm font-medium">Consumed unit
          <select className={input} value={effectiveUnit} onChange={event => setUnit(event.target.value as ServingUnit)}>
            {compatibleUnits.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Serving description (optional)
          <input className={input} maxLength={150} placeholder="e.g. 1 bowl, 2 cookies" value={servingDescription} onChange={event => setServingDescription(event.target.value)} />
        </label>
        {kind === 'beverage' && effectiveUnit !== 'ml' && effectiveUnit !== 'fl-oz' && <label className="block text-sm font-medium">Total drink volume in logged portion (ml)
          <input className={input} type="number" step="any" min="0" inputMode="decimal" placeholder="Unknown" value={fluid} onChange={event => { setFluid(event.target.value); setFluidChanged(true) }} />
          <span className="mt-1 block text-xs text-slate-500">If you do not know the volume, leave blank. A serving count is not automatically converted to ml.</span>
        </label>}
      </div>
      {kind === 'beverage' && (effectiveUnit === 'ml' || effectiveUnit === 'fl-oz') && <p className="text-xs text-slate-600">Logged fluid volume will be calculated from the entered {effectiveUnit}. Drink calories are counted only once.</p>}
      <NutritionFields values={nutrition} onChange={(field, value) => setNutrition(previous => ({ ...previous, [field]: value }))} />
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-evergreen-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to log'}</button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  )
}
