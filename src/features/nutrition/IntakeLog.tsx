import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import type { FoodEntry, SavedFood } from '../../domain/models'
import { deleteIntake, listIntakeForDay, listRecentIntake, saveWater } from '../../data/intakeRepository'
import { toLocalDay } from '../../lib/localDate'
import { selectedLogDay } from '../../lib/logDate'
import { readWaterPresets } from '../../data/settingsRepository'
import { parseNumber } from './NutritionFields'
import { FoodEntryForm } from './FoodEntryForm'
import { SavedFoodLibrary } from './SavedFoodLibrary'
import { NutritionSummary } from './NutritionSummary'
import { useToast } from '../../components/ToastProvider'

type Editor =
  | { type: 'new'; kind: 'food' | 'beverage' }
  | { type: 'edit'; entry: FoodEntry }
  | { type: 'saved'; saved: SavedFood }
  | { type: 'recent'; entry: FoodEntry }
  | { type: 'water'; entry?: FoodEntry }

const dateInput = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'
const actionButton = 'min-h-11 rounded-xl border border-evergreen-600 bg-white px-4 py-2 text-sm font-semibold text-evergreen-700 hover:bg-evergreen-50'

function defaultEditor(add: string | null): Editor | null {
  if (add === 'food') return { type: 'new', kind: 'food' }
  if (add === 'drink') return { type: 'new', kind: 'beverage' }
  if (add === 'water') return { type: 'water' }
  return null
}

export function IntakeLog() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [dayKey, setDayKey] = useState(() => selectedLogDay(searchParams.get('date')))
  const [editor, setEditor] = useState<Editor | null>(() => defaultEditor(searchParams.get('add')))
  const [waterVolume, setWaterVolume] = useState('250')
  const [waterDay, setWaterDay] = useState(dayKey)
  const [savingWater, setSavingWater] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const entries = useLiveQuery(() => listIntakeForDay(dayKey), [dayKey], undefined)
  const recent = useLiveQuery(() => listRecentIntake(), [], undefined)
  const waterPresets = useLiveQuery(() => readWaterPresets(), [], undefined)

  function showEditor(next: Editor) {
    setError('')
    setEditor(next)
    if (next.type === 'water') {
      setWaterVolume(next.entry ? String(next.entry.fluidMl ?? next.entry.quantity) : '250')
      setWaterDay(next.entry?.dayKey ?? dayKey)
    }
  }

  async function addWater(volume: number, date = dayKey, id?: string) {
    setSavingWater(true)
    setError('')
    try {
      await saveWater(date, volume, id)
      setDayKey(date)
      setEditor(null)
      toast.success(id ? 'Water updated.' : `Logged ${volume} ml of water.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not log water. Check local storage.')
    } finally {
      setSavingWater(false)
    }
  }

  function submitWater(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const volume = parseNumber(waterVolume, 'water volume')!
      void addWater(volume, waterDay, editor?.type === 'water' ? editor.entry?.id : undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid water volume.')
    }
  }

  async function remove(id: string) {
    setError('')
    try {
      await deleteIntake(id)
      setDeleteId(null)
      toast.success('Entry deleted.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete entry.')
    }
  }

  return (
    <div id="intake" className="scroll-mt-6 space-y-6">
      <section aria-labelledby="intake-section-title" className="space-y-3">
        <h2 id="intake-section-title" className="text-xl font-bold">Food and fluids</h2>
        <label className="block max-w-xs text-sm font-semibold">Date
          <input type="date" className={dateInput} max={toLocalDay(new Date())} value={dayKey}
            onChange={event => { setDayKey(event.target.value); setEditor(null); setError('') }} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => showEditor({ type: 'new', kind: 'food' })} className={actionButton}>+ Food</button>
          <button type="button" onClick={() => showEditor({ type: 'new', kind: 'beverage' })} className={actionButton}>+ Drink</button>
          <button type="button" onClick={() => showEditor({ type: 'water' })} className={actionButton}>+ Custom water</button>
        </div>
        <div className="rounded-2xl bg-evergreen-50 p-4">
          <p className="text-sm font-semibold text-evergreen-900">Quick water (ml)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {waterPresets === undefined && <span className="text-sm text-slate-600">Loading water presets…</span>}
            {waterPresets?.map(volume => (
              <button type="button" key={volume} disabled={savingWater}
                className="min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-evergreen-900 disabled:opacity-50"
                onClick={() => { void addWater(volume) }}>+ {volume}</button>
            ))}
          </div>
        </div>
        {editor && <div id="intake-editor">
          {editor.type === 'water' ? (
            <form onSubmit={submitWater} className="space-y-4 rounded-2xl border border-evergreen-100 bg-white p-4">
              <h3 className="text-lg font-bold">{editor.entry ? 'Edit water' : 'Log plain water'}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">Date
                  <input type="date" max={toLocalDay(new Date())} value={waterDay} onChange={event => setWaterDay(event.target.value)} className={dateInput} required />
                </label>
                <label className="block text-sm font-medium">Volume (ml)
                  <input type="number" min="0.01" step="any" inputMode="decimal" value={waterVolume} onChange={event => setWaterVolume(event.target.value)} className={dateInput} required />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={savingWater} className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save water</button>
                <button type="button" className={actionButton} onClick={() => setEditor(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <FoodEntryForm
              key={editor.type === 'edit' || editor.type === 'recent' ? `${editor.type}:${editor.entry.id}` : editor.type === 'saved' ? `saved:${editor.saved.id}` : `new:${editor.kind}`}
              dayKey={dayKey}
              kind={editor.type === 'new' ? editor.kind : editor.type === 'saved' ? editor.saved.kind ?? 'food' : editor.entry.kind}
              editing={editor.type === 'edit' ? editor.entry : undefined}
              recent={editor.type === 'recent' ? editor.entry : undefined}
              saved={editor.type === 'saved' ? editor.saved : undefined}
              onDone={() => { setEditor(null); toast.success('Intake entry saved.') }}
              onCancel={() => setEditor(null)}
            />
          )}
        </div>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      </section>

      <NutritionSummary entries={entries} />

      <section aria-labelledby="intake-history-title" className="space-y-3">
        <h2 id="intake-history-title" className="text-lg font-bold">Entries for {dayKey}</h2>
        {entries === undefined && <p role="status" className="text-sm text-slate-600">Loading entries…</p>}
        {entries?.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">No food or drinks recorded for this date.</p>}
        {entries?.map(entry => (
          <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{entry.name}</h3>
                <p className="mt-1 text-xs text-slate-600">
                  {entry.meal ? `${entry.meal} · ` : ''}{entry.quantity} {entry.unit} · {entry.beverageType === 'water' ? 'Water' : entry.kind === 'beverage' ? 'Drink' : 'Food'}
                </p>
                <p className="mt-1 text-sm">
                  {entry.beverageType !== 'water' && <>Calories: {entry.nutrientsSnapshot.energyKcal === null ? 'unknown' : `${Number(entry.nutrientsSnapshot.energyKcal.toFixed(1))} kcal`}</>}
                  {entry.kind === 'beverage' && `${entry.beverageType === 'water' ? '' : ' · '}Fluids: ${entry.fluidMl === null ? 'unknown' : `${Number(entry.fluidMl.toFixed(1))} ml`}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => showEditor(entry.beverageType === 'water' ? { type: 'water', entry } : { type: 'edit', entry })} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Edit</button>
                <button type="button" onClick={() => setDeleteId(entry.id)} className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-800">Delete</button>
              </div>
            </div>
            {deleteId === entry.id && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
              <p>Delete this logged entry? This cannot be undone.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { void remove(entry.id) }} className="min-h-11 rounded-lg bg-rose-700 px-4 font-semibold text-white">Confirm delete</button>
                <button type="button" onClick={() => setDeleteId(null)} className="min-h-11 rounded-lg border border-slate-300 px-4">Cancel</button>
              </div>
            </div>}
          </article>
        ))}
      </section>

      <section aria-labelledby="recent-intake-title" className="space-y-3">
        <h2 id="recent-intake-title" className="text-lg font-bold">Recent entries</h2>
        {recent === undefined && <p role="status" className="text-sm text-slate-600">Loading recent entries…</p>}
        {recent?.filter(entry => entry.beverageType !== 'water').length === 0 && <p className="text-sm text-slate-600">Nothing to repeat yet.</p>}
        <div className="flex flex-wrap gap-2">
          {recent?.filter(entry => entry.beverageType !== 'water').slice(0, 6).map(entry => (
            <button type="button" key={entry.id} onClick={() => showEditor({ type: 'recent', entry })} className={actionButton}>
              + {entry.name}
            </button>
          ))}
        </div>
      </section>

      <SavedFoodLibrary onUse={saved => showEditor({ type: 'saved', saved })} />
    </div>
  )
}
