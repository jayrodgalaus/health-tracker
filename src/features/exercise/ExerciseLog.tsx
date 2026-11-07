import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { estimateWorkout } from '../../domain/activity'
import { ageOnDay } from '../../domain/profile'
import type { ExerciseEnergyMethod, ExerciseEntry, ExerciseIntensity, Profile } from '../../domain/models'
import { listWeights } from '../../data/weightRepository'
import { deleteExercise, listExerciseForDay, listExerciseForWeek, saveExercise } from '../../data/exerciseRepository'
import { toLocalDay } from '../../lib/localDate'
import { selectedLogDay } from '../../lib/logDate'
import { parseNumber } from '../nutrition/NutritionFields'
import { ActivitySummary } from './ActivitySummary'

const inputClass = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'
const buttonClass = 'min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold'
const activities = ['Walking', 'Running', 'Cycling', 'Strength training', 'Table tennis', 'Other'] as const
const today = () => toLocalDay(new Date())

function isAdult(profile: Profile, day: string): boolean {
  const age = ageOnDay({
    birthDate: profile.birthDate, ageYears: profile.ageYears ?? null, ageAsOf: profile.ageAsOf ?? null
  }, day)
  return age !== null && age >= 18
}

export function ExerciseForm({ profile, selectedDay, editing, onSaved, onCancel }: {
  profile: Profile
  selectedDay: string
  editing?: ExerciseEntry
  onSaved: (day: string) => void
  onCancel: () => void
}) {
  const match = editing && activities.includes(editing.activity as typeof activities[number])
  const [type, setType] = useState(editing ? match ? editing.activity : 'Other' : 'Walking')
  const [custom, setCustom] = useState(editing && !match ? editing.activity : '')
  const [date, setDate] = useState(editing?.dayKey ?? selectedDay)
  const [time, setTime] = useState(editing?.timeOfDay ?? '')
  const [duration, setDuration] = useState(editing ? String(editing.durationMinutes) : '')
  const [intensity, setIntensity] = useState<ExerciseIntensity | ''>(editing?.intensity ?? '')
  const [strength, setStrength] = useState(editing?.isStrengthTraining ?? (editing?.activity === 'Strength training'))
  const [method, setMethod] = useState<ExerciseEnergyMethod>(
    editing?.estimationMethod === 'metNet' || editing?.estimationMethod === 'manualActive'
      ? editing.estimationMethod : 'unknown'
  )
  const [met, setMet] = useState(editing?.met == null ? '' : String(editing.met))
  const [manual, setManual] = useState(editing?.estimatedEnergyKcal == null ? '' : String(editing.estimatedEnergyKcal))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const adult = isAdult(profile, date)
  const effectiveMethod = adult ? method : 'unknown'

  function changeActivity(value: string) {
    setType(value)
    if (value === 'Strength training') setStrength(true)
    else if (type === 'Strength training') setStrength(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const activity = type === 'Other' ? custom : type
      await saveExercise({
        dayKey: date,
        activity,
        durationMinutes: parseNumber(duration, 'duration')!,
        intensity: intensity || null,
        calorieMethod: effectiveMethod,
        met: effectiveMethod === 'metNet' ? parseNumber(met, 'MET') : null,
        manualActiveKcal: effectiveMethod === 'manualActive' ? parseNumber(manual, 'active calories') : null,
        isStrengthTraining: strength,
        timeOfDay: time.trim() || null,
        notes: notes.trim() || null
      }, editing?.id)
      onSaved(date)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the workout. Check local storage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={event => { void submit(event) }} noValidate className="space-y-4 rounded-2xl border border-evergreen-100 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-lg font-bold">{editing ? 'Edit workout' : 'Record exercise'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Activity
          <select className={inputClass} value={type} onChange={event => changeActivity(event.target.value)}>
            {activities.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        {type === 'Other' && <label className="block text-sm font-semibold">Custom activity
          <input className={inputClass} maxLength={120} value={custom} onChange={event => setCustom(event.target.value)} placeholder="e.g. Swimming" required />
        </label>}
        <label className="block text-sm font-semibold">Date
          <input className={inputClass} type="date" value={date} max={today()} onChange={event => setDate(event.target.value)} required />
        </label>
        <label className="block text-sm font-semibold">Local time (optional)
          <input className={inputClass} type="time" value={time} onChange={event => setTime(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Duration (minutes)
          <input className={inputClass} type="number" inputMode="decimal" min="0.1" max="1440" step="any" value={duration} onChange={event => setDuration(event.target.value)} placeholder="e.g. 30" required />
        </label>
        <label className="block text-sm font-semibold">Intensity (optional)
          <select className={inputClass} value={intensity} onChange={event => setIntensity(event.target.value as ExerciseIntensity | '')}>
            <option value="">Not classified</option>
            <option value="light">Light</option><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option>
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={strength} onChange={event => setStrength(event.target.checked)} />
        Include this as a logged strength-training day
      </label>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-bold">Additional workout-energy estimate (optional)</legend>
        <p className="text-xs leading-5 text-slate-600">
          Activity duration is tracked regardless of energy method. No MET values or calories are inferred from a workout name or intensity.
          Choose manual only if the source explicitly reports ACTIVE/incremental kcal, not total/gross calories.
        </p>
        {!adult ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          This date has no confirmed adult age. Simple exercise logging is available, but adult-oriented energy estimates are not.
        </p> : <div className="space-y-2 text-sm">
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={effectiveMethod === 'unknown'} onChange={() => setMethod('unknown')} /> No energy estimate</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={effectiveMethod === 'metNet'} onChange={() => setMethod('metNet')} /> Calculate net incremental kcal from a MET I provide</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={effectiveMethod === 'manualActive'} onChange={() => setMethod('manualActive')} /> Enter active/incremental kcal manually</label>
        </div>}
        {adult && effectiveMethod === 'metNet' && <label className="block text-sm font-semibold">Chosen activity MET (1–25)
          <input className={inputClass} type="number" min="1" max="25" step="any" inputMode="decimal" value={met} onChange={event => setMet(event.target.value)} placeholder="Enter a MET value" required />
        </label>}
        {adult && effectiveMethod === 'manualActive' && <label className="block text-sm font-semibold">Active/incremental calories (kcal)
          <input className={inputClass} type="number" min="0" max="6000" step="any" inputMode="decimal" value={manual} onChange={event => setManual(event.target.value)} required placeholder="Active kcal only" />
        </label>}
      </fieldset>
      <label className="block text-sm font-semibold">Notes (optional, max 500 characters)
        <textarea className={inputClass} rows={2} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} />
      </label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Save exercise'}</button>
        <button type="button" className={buttonClass} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export function ExerciseLog({ profile }: { profile: Profile }) {
  const [searchParams] = useSearchParams()
  const [dayKey, setDayKey] = useState(() => selectedLogDay(searchParams.get('date')))
  const [adding, setAdding] = useState(() => searchParams.get('add') === 'exercise')
  const [editing, setEditing] = useState<ExerciseEntry | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const activitiesForDay = useLiveQuery(() => listExerciseForDay(dayKey), [dayKey], undefined)
  const activitiesForWeek = useLiveQuery(() => listExerciseForWeek(dayKey), [dayKey], undefined)
  const weights = useLiveQuery(() => listWeights(), [], undefined)
  const adult = isAdult(profile, dayKey)

  async function remove(id: string) {
    setError('')
    setNotice('')
    try {
      await deleteExercise(id)
      if (editing?.id === id) setEditing(null)
      setConfirmDelete(null)
      setNotice('Exercise entry deleted.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this workout.')
    }
  }

  function startAdding() {
    setEditing(null)
    setAdding(true)
    setError('')
    setNotice('')
  }

  return (
    <section id="exercise" aria-labelledby="exercise-log-title" className="scroll-mt-6 space-y-5">
      <div>
        <h2 id="exercise-log-title" className="text-xl font-bold">Exercise logging</h2>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm font-semibold">Date
          <input className={inputClass} type="date" value={dayKey} max={today()}
            onChange={event => { setDayKey(event.target.value); setAdding(false); setEditing(null); setError('') }} />
        </label>
        <button type="button" className="min-h-11 rounded-xl bg-evergreen-600 px-5 py-2 text-sm font-semibold text-white" onClick={startAdding}>+ Exercise</button>
      </div>
      {(adding || editing) && <ExerciseForm key={editing?.id ?? 'new'} profile={profile} selectedDay={dayKey}
        editing={editing ?? undefined}
        onSaved={day => { setDayKey(day); setAdding(false); setEditing(null); setNotice('Exercise saved locally. Activity summaries have updated.') }}
        onCancel={() => { setAdding(false); setEditing(null) }} />}
      {notice && <p role="status" className="rounded-xl bg-evergreen-50 p-3 text-sm text-evergreen-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <ActivitySummary dayKey={dayKey} profile={profile} dayActivities={activitiesForDay} weekActivities={activitiesForWeek} weights={weights} />
      <div className="space-y-3">
        <h3 className="text-lg font-bold">Recorded exercise · {dayKey}</h3>
        {activitiesForDay === undefined && <p role="status" className="text-sm text-slate-600">Loading workouts…</p>}
        {activitiesForDay?.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">No workouts logged for this day. You can add a past session, or leave a rest day unlogged.</p>}
        {activitiesForDay?.map(entry => {
          const estimated = weights ? estimateWorkout(entry, weights, adult) : null
          return <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold">{entry.activity}</h4>
                <p className="mt-1 text-xs text-slate-600">{entry.timeOfDay ? `${entry.timeOfDay} · ` : ''}{entry.durationMinutes} min · {entry.intensity ?? 'Unclassified intensity'}{entry.isStrengthTraining ? ' · Strength' : ''}</p>
                <p className="mt-2 text-sm">
                  Additional workout kcal: {!adult ? 'Not evaluated (adult model)' : estimated?.kcal == null ? 'Unknown' : `≈ ${Number(estimated.kcal.toFixed(1))} kcal`}
                </p>
                {adult && estimated && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">{estimated.explanation}</p>}
                {entry.notes && <p className="mt-2 text-sm text-slate-700">{entry.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" className={buttonClass} onClick={() => { setAdding(false); setEditing(entry); setNotice('') }}>Edit</button>
                <button type="button" className="min-h-11 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-800" onClick={() => setConfirmDelete(entry.id)}>Delete</button>
              </div>
            </div>
            {confirmDelete === entry.id && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
              <p>Delete this exercise entry? This cannot be undone.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="min-h-11 rounded-lg bg-rose-700 px-4 font-semibold text-white" onClick={() => { void remove(entry.id) }}>Confirm delete</button>
                <button type="button" className={buttonClass} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>}
          </article>
        })}
      </div>
    </section>
  )
}
