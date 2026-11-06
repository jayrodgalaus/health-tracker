import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile, WeightEntry } from '../../domain/models'
import { displayNumber, kilogramsFrom, kilogramsTo } from '../../domain/units'
import { deleteWeight, listWeights, moveWeight, saveWeight } from '../../data/weightRepository'
import { toLocalDay } from '../../lib/localDate'

const today = () => toLocalDay(new Date())
const inputClass = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

export function WeightLog({ profile }: { profile: Profile }) {
  const weights = useLiveQuery(() => listWeights(), [], undefined)
  const unit = profile.units.mass
  const [editingFrom, setEditingFrom] = useState<string | null>(null)
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function edit(entry: WeightEntry) {
    setEditingFrom(entry.dayKey)
    setDate(entry.dayKey)
    setAmount(displayNumber(kilogramsTo(entry.weightKg, unit), 2))
    setNotice('')
    setError('')
  }
  function reset() {
    setEditingFrom(null)
    setDate(today())
    setAmount('')
    setConfirmDelete(null)
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    const parsed = Number(amount.replace(',', '.'))
    if (!amount.trim() || !Number.isFinite(parsed)) {
      setError('Enter a valid weight.')
      return
    }
    setSaving(true)
    try {
      const kg = kilogramsFrom(parsed, unit)
      if (editingFrom && editingFrom !== date) await moveWeight(editingFrom, date, kg)
      else await saveWeight(date, kg)
      reset()
      setNotice('Weight saved on this device.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saving failed. Check local storage.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(day: string) {
    setError('')
    try {
      await deleteWeight(day)
      if (editingFrom === day) reset()
      setConfirmDelete(null)
      setNotice('Measurement deleted.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the measurement.')
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={e => { void submit(e) }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">{editingFrom ? 'Edit dated weight' : 'Add a weight measurement'}</h2>
        <p className="mt-2 text-sm text-slate-600">One primary measured value per date. Edit a past entry rather than adding a duplicate. Never filled in automatically.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Measurement date
            <input className={inputClass} type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} required />
          </label>
          <label className="text-sm font-medium">Weight ({unit})
            <input className={inputClass} type="number" inputMode="decimal" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="e.g. 70.5" />
          </label>
        </div>
        {editingFrom && date !== editingFrom && <p className="mt-2 text-xs text-slate-600">This moves the saved measurement from {editingFrom} to {date}. Existing destination dates cannot be overwritten.</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="min-h-11 rounded-xl bg-evergreen-600 px-5 py-2 font-semibold text-white disabled:opacity-50" type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingFrom ? 'Save changes' : 'Save measurement'}
          </button>
          {editingFrom && <button className="min-h-11 rounded-xl border border-slate-300 px-5 py-2 font-semibold" type="button" onClick={reset}>Cancel edit</button>}
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        {notice && <p role="status" className="mt-3 rounded-lg bg-evergreen-50 p-3 text-sm text-evergreen-900">{notice}</p>}
      </form>

      <section aria-labelledby="weight-history-title" className="space-y-3">
        <h2 id="weight-history-title" className="text-lg font-bold">Weight history</h2>
        {weights === undefined && <p role="status" className="text-sm text-slate-600">Loading saved measurements…</p>}
        {weights?.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">No measurements have been recorded yet.</p>}
        {weights?.map(entry => (
          <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{entry.dayKey}</p>
                <p className="mt-1 text-xl font-semibold">{displayNumber(kilogramsTo(entry.weightKg, unit), 1)} <span className="text-sm">{unit}</span></p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => edit(entry)}>Edit</button>
                <button type="button" className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-800" onClick={() => setConfirmDelete(entry.dayKey)}>Delete</button>
              </div>
            </div>
            {confirmDelete === entry.dayKey && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
              <p>Delete the measurement from {entry.dayKey}? This cannot be undone.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="min-h-11 rounded-lg bg-rose-700 px-3 font-semibold text-white" onClick={() => { void remove(entry.dayKey) }}>Confirm delete</button>
                <button type="button" className="min-h-11 rounded-lg border border-slate-300 px-3" onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>}
          </article>
        ))}
      </section>
    </div>
  )
}
