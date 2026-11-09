import { useState, type FormEvent } from 'react'
import type { FoodEntry, MealCategory, NutrientSnapshot, NutritionSource, SavedFood, ServingUnit } from '../../domain/models'
import { portionRatio, referenceNutritionForEntry } from '../../domain/nutrition'
import { saveIntake } from '../../data/intakeRepository'
import { toLocalDay } from '../../lib/localDate'
import { FoodLookupCombobox, type FoodLookupChoice } from './FoodLookupCombobox'
import { externalFoodUrl } from '../../data/openFoodFacts'
import { usdaFoodUrl } from '../../data/ingredientCatalog'
import { basisFor, inferBasisMode, SERVING_UNITS, type BasisMode } from './labelBasis'
import { NutritionFields, inputsFromNutrition, nutritionFromInputs, parseNumber } from './NutritionFields'
import { FloatingNutritionCamera } from '../../components/FloatingNutritionCamera'
import type { ParsedNutritionLabel } from '../../domain/nutritionLabelOcr'

const input = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'
interface Props {
  dayKey: string
  kind: 'food' | 'beverage'
  editing?: FoodEntry
  saved?: SavedFood
  recent?: FoodEntry
  onDone: (day: string) => void
  onCancel: () => void
}

export function FoodEntryForm({ dayKey, kind, editing, saved, recent, onDone, onCancel }: Props) {
  const source = editing ?? recent
  const reference = source ? referenceNutritionForEntry(source) : saved?.nutrientsPerBasis
  const initialBasis = source?.labelBasis ?? saved?.labelBasis ?? { quantity: 1, unit: 'serving' as const }
  const initialMode = inferBasisMode(initialBasis)
  const [name, setName] = useState(source?.name ?? saved?.name ?? '')
  const [selectedSavedFoodId, setSelectedSavedFoodId] = useState<string | null>(
    editing?.savedFoodId ?? recent?.savedFoodId ?? saved?.id ?? null
  )
  const [nutritionSource, setNutritionSource] = useState<NutritionSource | null>(
    source?.nutritionSource ?? null
  )
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
  const [lookupApplied, setLookupApplied] = useState(false)
  const [lookupFluidPerBasis, setLookupFluidPerBasis] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const basis = basisFor(mode, basisQuantity, basisUnit)
  const compatibleUnits: ServingUnit[] = basis.unit === 'g' || basis.unit === 'oz' ? ['g', 'oz'] :
    basis.unit === 'ml' || basis.unit === 'fl-oz' ? ['ml', 'fl-oz'] : [basis.unit]
  const effectiveUnit = compatibleUnits.includes(unit) ? unit : basis.unit
  const calculatedLookupFluid = (() => {
    if (kind !== 'beverage' || fluidChanged || !lookupApplied || lookupFluidPerBasis === null ||
      effectiveUnit === 'ml' || effectiveUnit === 'fl-oz') return fluid
    try {
      return String(lookupFluidPerBasis * portionRatio(basis, Number(quantity), effectiveUnit))
    } catch {
      return ''
    }
  })()

  function chooseLookup(choice: FoodLookupChoice) {
    const item = choice.product
    const selected = choice.type === 'saved' ? {
      basis: choice.product.labelBasis,
      nutrients: choice.product.nutrientsPerBasis,
      savedId: choice.product.id,
      nutritionSource: null
    } : {
      basis: { quantity: 100, unit: choice.product.basisUnit },
      nutrients: choice.product.nutrients,
      savedId: null,
      nutritionSource: choice.product.nutritionSource
    }
    const resolvedMode = inferBasisMode(selected.basis)
    setName(item.name)
    setMode(resolvedMode)
    setBasisQuantity(String(selected.basis.quantity))
    setBasisUnit(selected.basis.unit)
    setQuantity(String(selected.basis.quantity))
    setUnit(selected.basis.unit)
    setServingDescription(item.servingDescription ?? '')
    setNutrition(inputsFromNutrition(selected.nutrients))
    setSelectedSavedFoodId(selected.savedId)
    setNutritionSource(selected.nutritionSource)
    setLookupApplied(true)
    setLookupFluidPerBasis(choice.type === 'saved' ? choice.product.fluidMlPerBasis ?? null : null)
    setFluid('')
    setFluidChanged(false)
    setError('')
  }

  function applyScannedLabel(label: ParsedNutritionLabel) {
    // OCR is only a draft of the printed facts; no automatic save or guessing.
    setNutrition(() => {
      // A new label is a new reference: unrecognized nutrients become unknown,
      // never silently inherited from a previously selected product.
      const next = inputsFromNutrition()
      for (const [field, value] of Object.entries(label.nutrients)) {
        if (value !== undefined) {
          next[field as keyof typeof next] = String(value)
        }
      }
      return next
    })
    if (label.basis) {
      const scanned = label.basis
      setMode(inferBasisMode(scanned))
      setBasisQuantity(String(scanned.quantity))
      setBasisUnit(scanned.unit)
      setQuantity(String(scanned.quantity))
      setUnit(scanned.unit)
    }
    if (label.servingDescription) setServingDescription(label.servingDescription)
    setNutritionSource(null)
    setSelectedSavedFoodId(null)
    setLookupApplied(false)
    setLookupFluidPerBasis(null)
    // A new scanned label must never reuse a previous drink's measured volume.
    setFluid('')
    setFluidChanged(true)
    setError('')
  }

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
        } else if (lookupApplied) {
          fluidMl = lookupFluidPerBasis === null ? null :
            lookupFluidPerBasis * portionRatio(resolvedBasis, amount, effectiveUnit)
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
        savedFoodId: selectedSavedFoodId,
        nutritionSource,
        quantity: amount, unit: effectiveUnit, labelBasis: resolvedBasis,
        servingDescription,
        referenceNutrients, fluidMl
      }, editing?.id)
      onDone(date)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Entry could not be saved. Check local storage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={event => { void submit(event) }} noValidate className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FoodLookupCombobox
          name={name}
          kind={kind}
          inputClass={input}
          onNameChange={next => {
            setName(next)
            setSelectedSavedFoodId(null)
            // Keep source attribution for already-populated nutrient values,
            // even if the user edits the displayed name before saving.
          }}
          onChoose={chooseLookup}
        />
        <label className="block text-sm font-medium">Date
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
          <input className={input} type="number" step="any" min="0" inputMode="decimal" placeholder="Unknown" value={calculatedLookupFluid} onChange={event => { setFluid(event.target.value); setFluidChanged(true) }} />
        </label>}
      </div>
      {nutritionSource && <p className="text-xs leading-5 text-slate-600">
        Nutrition source: {nutritionSource.provider !== 'open-food-facts' ? (
          <>
            <a className="font-semibold text-evergreen-700 underline" target="_blank" rel="noopener noreferrer"
              href={usdaFoodUrl(nutritionSource.fdcId) ?? 'https://fdc.nal.usda.gov/'}>
              USDA FoodData Central {nutritionSource.provider==='usda-foundation'?'Foundation Foods':'SR Legacy'} · #{nutritionSource.fdcId}</a>
            {' '}({nutritionSource.provider==='usda-foundation'?'April 2026':'April 2018'}).
          </>
        ) : (
          <>
            <a className="font-semibold text-evergreen-700 underline" target="_blank" rel="noopener noreferrer"
              href={externalFoodUrl(nutritionSource.productCode) ?? 'https://world.openfoodfacts.org/'}>
              Open Food Facts product {nutritionSource.productCode}</a>.
            {' '}
          </>
        )}
      </p>}
      <NutritionFields values={nutrition} onChange={(field, value) => setNutrition(previous => ({ ...previous, [field]: value }))} />
      <FloatingNutritionCamera onRecognized={applyScannedLabel} />
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-evergreen-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to log'}</button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  )
}
