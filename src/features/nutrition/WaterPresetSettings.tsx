import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readWaterPresets, saveWaterPresets } from '../../data/settingsRepository'
import { parseNumber } from './NutritionFields'
import { useToast } from '../../components/ToastProvider'

export function WaterPresetSettings() {
  const toast = useToast()
  const presets = useLiveQuery(() => readWaterPresets(), [], undefined)
  const [amounts, setAmounts] = useState<string[]>(['150', '250', '350', '500'])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (presets) setAmounts(presets.map(String))
  }, [presets?.join(',')])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await saveWaterPresets(amounts.map(value => parseNumber(value, 'water preset')!))
      toast.success('Water presets saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save water amounts.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="rounded-3xl border border-slate-200 bg-white px-5 pb-5 pt-5 shadow-sm sm:p-6" aria-labelledby="water-presets-title">
    <h2 id="water-presets-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
      <span aria-hidden="true" className="rounded-lg bg-evergreen-50 px-2 py-1 text-xs font-extrabold text-evergreen-700">01</span>
      Water quick-add amounts
    </h2>
    {presets === undefined && <p role="status" className="mt-2 text-sm text-slate-600">Loading preferences…</p>}
    {presets !== undefined && <form onSubmit={event => { void save(event) }} className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {amounts.map((amount, index) => <label key={index} className="min-w-0 text-sm font-semibold text-slate-700">Preset {index + 1} (ml)
          <input type="number" min="25" max="3000" step="any" inputMode="decimal"
            className="mt-1.5 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 transition-colors focus:border-evergreen-600 focus:outline-none focus:ring-2 focus:ring-evergreen-600/20"
            value={amount} onChange={event => setAmounts(current => current.map((item, i) => i === index ? event.target.value : item))} required />
        </label>)}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <button type="submit" disabled={saving} className="min-h-12 w-full rounded-2xl bg-evergreen-600 px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-evergreen-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
        {saving ? 'Saving…' : 'Save water presets'}
      </button>
    </form>}
  </section>
}
