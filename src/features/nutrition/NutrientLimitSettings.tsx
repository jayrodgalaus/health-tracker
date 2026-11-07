import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useToast } from '../../components/ToastProvider'
import { readNutrientComparisonLimits, saveNutrientComparisonLimits } from '../../data/settingsRepository'
import { parseNumber } from './NutritionFields'

export function NutrientLimitSettings() {
  const limits = useLiveQuery(() => readNutrientComparisonLimits(), [], undefined)
  const toast = useToast()
  const [sugars, setSugars] = useState('')
  const [sodium, setSodium] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (limits !== undefined) {
      setSugars(limits.sugarsG === null ? '' : String(limits.sugarsG))
      setSodium(limits.sodiumMg === null ? '' : String(limits.sodiumMg))
    }
  }, [limits?.sugarsG, limits?.sodiumMg])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveNutrientComparisonLimits({
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

  return <section aria-labelledby="nutrient-limits-title" className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 id="nutrient-limits-title" className="text-lg font-semibold">Calendar nutrient comparison limits</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">
      Set optional daily upper limits for total sugars and sodium. The Calendar Nutrients card
      shows what percentage of each chosen limit is used by known recorded entries. These are
      your tracking comparisons, not nutritional recommendations or daily evaluation scores.
    </p>
    {limits === undefined ? <p role="status" className="mt-2 text-sm text-slate-600">Loading limits…</p> :
      <form onSubmit={event => { void save(event) }} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Total sugars upper limit (g/day)
            <input type="number" step="any" min="0.1" max="3000" inputMode="decimal"
              placeholder="Not set"
              className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base"
              value={sugars} onChange={event => setSugars(event.target.value)} />
          </label>
          <label className="text-sm font-semibold">Sodium upper limit (mg/day)
            <input type="number" step="any" min="1" max="100000" inputMode="decimal"
              placeholder="Not set"
              className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base"
              value={sodium} onChange={event => setSodium(event.target.value)} />
          </label>
        </div>
        <p className="text-xs leading-5 text-slate-600">
          Leave a field blank to disable its percentage. Sugars means total sugars, not added sugars.
          Limits apply when viewing any Calendar date, including past dates; changing them never alters logged nutrients or dated goal rules.
          If a log is missing a nutrient value, its displayed percentage is a minimum (≥).
        </p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        <button type="submit" disabled={saving}
          className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save nutrient limits'}
        </button>
      </form>}
  </section>
}
