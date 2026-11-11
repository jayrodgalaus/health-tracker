import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useToast } from '../../components/ToastProvider'
import { readNutrientComparisonLimits, saveNutrientComparisonLimits } from '../../data/settingsRepository'
import { parseNumber } from './NutritionFields'

export function NutrientLimitSettings() {
  const limits = useLiveQuery(() => readNutrientComparisonLimits(), [], undefined)
  const toast = useToast()
  const [carbs, setCarbs] = useState('')
  const [sugars, setSugars] = useState('')
  const [sodium, setSodium] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (limits !== undefined) {
      setCarbs(limits.carbohydratesG === null ? '' : String(limits.carbohydratesG))
      setSugars(limits.sugarsG === null ? '' : String(limits.sugarsG))
      setSodium(limits.sodiumMg === null ? '' : String(limits.sodiumMg))
    }
  }, [limits?.carbohydratesG, limits?.sugarsG, limits?.sodiumMg])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveNutrientComparisonLimits({
        carbohydratesG: parseNumber(carbs, 'carbs daily limit', true),
        sugarsG: parseNumber(sugars, 'total sugar daily limit', true),
        sodiumMg: parseNumber(sodium, 'sodium daily limit', true)
      })
      toast.success('Nutrient comparison limits saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save nutrient limits.')
    } finally {
      setSaving(false)
    }
  }

  return <section aria-labelledby="nutrient-limits-title" className="rounded-3xl border border-slate-200 bg-white px-5 pb-5 pt-5 shadow-sm sm:p-6">
    <h2 id="nutrient-limits-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
      <span aria-hidden="true" className="rounded-lg bg-evergreen-50 px-2 py-1 text-xs font-extrabold text-evergreen-700">02</span>
      Calendar nutrient comparison limits
    </h2>
    {limits === undefined ? <p role="status" className="mt-2 text-sm text-slate-600">Loading limits…</p> :
      <form onSubmit={event => { void save(event) }} className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block min-w-0 text-sm font-semibold text-slate-700">Carbs upper limit (g/day)
            <input type="number" step="any" min="0.1" max="2000" inputMode="decimal"
              placeholder="Not set"
              className="mt-1.5 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-2 focus:ring-evergreen-600/20"
              value={carbs} onChange={event => setCarbs(event.target.value)} />
          </label>
          <label className="block min-w-0 text-sm font-semibold text-slate-700">Total sugars upper limit (g/day)
            <input type="number" step="any" min="0.1" max="3000" inputMode="decimal"
              placeholder="Not set"
              className="mt-1.5 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-2 focus:ring-evergreen-600/20"
              value={sugars} onChange={event => setSugars(event.target.value)} />
          </label>
          <label className="block min-w-0 text-sm font-semibold text-slate-700">Sodium upper limit (mg/day)
            <input type="number" step="any" min="1" max="100000" inputMode="decimal"
              placeholder="Not set"
              className="mt-1.5 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-2 focus:ring-evergreen-600/20"
              value={sodium} onChange={event => setSodium(event.target.value)} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        <button type="submit" disabled={saving}
          className="min-h-12 w-full rounded-2xl bg-evergreen-600 px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-evergreen-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {saving ? 'Saving…' : 'Save nutrient limits'}
        </button>
      </form>}
  </section>
}
