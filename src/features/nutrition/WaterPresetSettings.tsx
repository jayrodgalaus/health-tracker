import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readWaterPresets, saveWaterPresets } from '../../data/settingsRepository'
import { parseNumber } from './NutritionFields'

export function WaterPresetSettings() {
  const presets = useLiveQuery(() => readWaterPresets(), [], undefined)
  const [amounts, setAmounts] = useState<string[]>(['150', '250', '350', '500'])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (presets) setAmounts(presets.map(String))
  }, [presets?.join(',')])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    try {
      await saveWaterPresets(amounts.map(value => parseNumber(value, 'water preset')!))
      setNotice('Quick water amounts saved on this device.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save water amounts.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="water-presets-title">
    <h2 id="water-presets-title" className="text-lg font-semibold">Water quick-add amounts</h2>
    {presets === undefined && <p role="status" className="mt-2 text-sm text-slate-600">Loading preferences…</p>}
    {presets !== undefined && <form onSubmit={event => { void save(event) }} className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {amounts.map((amount, index) => <label key={index} className="text-sm font-semibold">Preset {index + 1} (ml)
          <input type="number" min="25" max="3000" step="any" inputMode="decimal"
            className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base"
            value={amount} onChange={event => setAmounts(current => current.map((item, i) => i === index ? event.target.value : item))} required />
        </label>)}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      {notice && <p role="status" className="text-sm text-evergreen-700">{notice}</p>}
      <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? 'Saving…' : 'Save water presets'}
      </button>
    </form>}
  </section>
}
