import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { UnitPreferences } from '../../domain/models'
import { displayNumber, kilogramsFrom, kilogramsTo } from '../../domain/units'
import { deleteWeight, readWeightForDay, saveWeight } from '../../data/weightRepository'

const inputClass='mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

export function WeightQuickCard({ dayKey, unit }: {dayKey: string; unit: UnitPreferences['mass']}) {
  const entry = useLiveQuery(() => readWeightForDay(dayKey), [dayKey], undefined)
  const [amount, setAmount] = useState('')
  const [changed, setChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!changed && entry !== undefined) {
      setAmount(entry ? displayNumber(kilogramsTo(entry.weightKg,unit),2) : '')
    }
  }, [entry?.weightKg, entry?.id, unit, changed, entry === undefined])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (!amount.trim() || !Number.isFinite(Number(amount))) throw new Error('Enter a valid weight.')
      await saveWeight(dayKey, kilogramsFrom(Number(amount),unit))
      setChanged(false)
      setNotice('Weight saved on this device.')
    } catch(cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save weight.')
    } finally {setSaving(false)}
  }

  async function remove() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await deleteWeight(dayKey)
      setChanged(false)
      setAmount('')
      setConfirmDelete(false)
      setNotice('Weight measurement deleted.')
    } catch(cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete weight.')
    } finally {setSaving(false)}
  }

  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-bold">Weight</h2>
    {entry === undefined ? <p role="status" className="mt-3 text-sm text-slate-600">Loading weight…</p> : (
      <form onSubmit={event=>{void save(event)}} className="mt-4 space-y-4">
        <label className="block max-w-xs text-sm font-semibold">Weight ({unit})
          <input type="number" min="0" step="any" inputMode="decimal" required className={inputClass}
            placeholder="Enter measured weight" value={amount}
            onChange={event=>{setAmount(event.target.value);setChanged(true);setError('');setNotice('')}} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving}
            className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Saving…' : entry ? 'Update weight' : 'Save weight'}
          </button>
          {entry && <button type="button" disabled={saving}
            onClick={()=>setConfirmDelete(true)}
            className="min-h-11 rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800">Delete weight</button>}
        </div>
      </form>
    )}
    {confirmDelete && entry && <div className="mt-4 space-y-3 rounded-xl bg-rose-50 p-3 text-sm">
      <p>Delete this recorded weight? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={()=>{void remove()}}
          className="min-h-11 rounded-xl bg-rose-700 px-4 font-semibold text-white">Confirm delete</button>
        <button type="button" onClick={()=>setConfirmDelete(false)}
          className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold">Cancel</button>
      </div>
    </div>}
    {notice && <p role="status" className="mt-3 text-sm text-evergreen-800">{notice}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
  </div>
}
