import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { estimateWorkout, isDistanceActivity } from '../../domain/activity'
import { STRENGTH_MET_PRESETS, strengthMetPresetForValue } from '../../domain/strengthMetPresets'
import { degreesToGradePercent, gradePercentToDegrees, MAX_INCLINE_DEGREES } from '../../domain/paceGrade'
import { hasTwoPaceInputs, initialPaceInputs, updatePaceInputs } from '../../domain/paceInputs'
import type { PaceField } from '../../domain/paceInputs'
import { ageOnDay } from '../../domain/profile'
import type { ExerciseEnergyMethod, ExerciseEntry, Profile } from '../../domain/models'
import { listWeights } from '../../data/weightRepository'
import { deleteExercise, listExerciseForDay, listExerciseForWeek, saveExercise } from '../../data/exerciseRepository'
import { toLocalDay } from '../../lib/localDate'
import { selectedLogDay } from '../../lib/logDate'
import { parseNumber } from '../nutrition/NutritionFields'
import { ActivitySummary } from './ActivitySummary'
import { useToast } from '../../components/ToastProvider'

const inputClass = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'
const buttonClass = 'min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold'
const activities = ['Walking', 'Running', 'Cycling', 'Strength training', 'Table tennis', 'Other'] as const
const today = () => toLocalDay(new Date())

/** A malformed unfinished input is unassessable, never silently used as zero. */
function previewNumber(raw: string): number | null {
  try { return parseNumber(raw, 'preview amount', true) }
  catch { return Number.NaN }
}


/** Unit adapter: degree input to canonical percent for previews and saved entries. */
function enteredInclinePercent(raw: string): number | null {
  const degrees = previewNumber(raw)
  return degrees === null ? null : degreesToGradePercent(degrees)
}
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
  const [pace, setPace] = useState(() => initialPaceInputs({
    duration: editing?.durationMinutes == null ? '' : String(editing.durationMinutes),
    distance: editing?.distanceKm == null ? '' : String(editing.distanceKm),
    speed: editing?.speedKmh == null ? '' : String(editing.speedKmh)
  }))
  const { duration, distance, speed } = pace.values
  function changePace(field: PaceField, value: string) {
    setPace(current => updatePaceInputs(current, field, value))
    setError('')
  }
  const [incline, setIncline] = useState(editing?.inclinePercent == null ? '' : String(Number(gradePercentToDegrees(editing.inclinePercent).toFixed(4))))
  const [strength, setStrength] = useState(editing?.isStrengthTraining ?? (editing?.activity === 'Strength training'))
  const [method, setMethod] = useState<'auto' | 'unknown' | 'metNet' | 'manualActive'>(
    editing?.estimationMethod === 'distanceNet' || editing?.estimationMethod === 'activityTimeNet' || editing?.estimationMethod === 'paceGradeNet'
      ? 'auto' : editing?.estimationMethod === 'metNet' || editing?.estimationMethod === 'manualActive'
        ? editing.estimationMethod : editing ? 'unknown' : 'auto'
  )
  const [met, setMet] = useState(editing?.met == null ? '' : String(editing.met))
  const [strengthMetChoice, setStrengthMetChoice] = useState(() => editing?.met == null
    ? '' : strengthMetPresetForValue(editing.met)?.code ?? 'custom')
  const [manual, setManual] = useState(editing?.estimatedEnergyKcal == null ? '' : String(editing.estimatedEnergyKcal))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const adult = isAdult(profile, date)
  const walkRun = isDistanceActivity(type)
  const showStrengthMetPresets = !walkRun && (type === 'Strength training' || strength)
  const effectiveMethod: ExerciseEnergyMethod = !adult ? 'unknown'
    : method === 'auto' && walkRun
      ? 'paceGradeNet'
      : method === 'auto' ? 'unknown' : method
  const weights = useLiveQuery(() => listWeights(), [], undefined)
  const previewEntry: ExerciseEntry = {
    id: 'preview', dayKey: date, startedAt: '', createdAt: '', updatedAt: '',
    activity: type === 'Other' ? custom : type, durationMinutes: previewNumber(duration),
    distanceKm: walkRun ? previewNumber(distance) : null,
    speedKmh: walkRun ? previewNumber(speed) : null,
    inclinePercent: walkRun ? enteredInclinePercent(incline) : null,
    intensity: editing?.intensity ?? null, estimationMethod: effectiveMethod,
    estimatedEnergyKcal: effectiveMethod === 'manualActive' ? previewNumber(manual) : null,
    met: effectiveMethod === 'metNet'
      ? (showStrengthMetPresets && !strengthMetChoice ? null : previewNumber(met)) : null
  }
  const preview = weights === undefined ? null : estimateWorkout(previewEntry, weights, adult)
  const estimateText = preview?.kcal === null || preview?.kcal === undefined
    ? 'Unavailable' : '≈ ' + Number(preview.kcal.toFixed(1)).toLocaleString() + ' kcal'

  function changeActivity(value: string) {
    const switchingToWalkRun = isDistanceActivity(value) && !isDistanceActivity(type)
    const switchingAway = !isDistanceActivity(value) && isDistanceActivity(type)
    setType(value)
    if (type === 'Strength training' && value !== 'Strength training' && method === 'metNet') {
      setMet('')
      setStrengthMetChoice('')
    }
    if (value === 'Strength training' && (method === 'unknown' || method === 'auto')) {
      setMethod('metNet')
    } else if (type === 'Strength training' && method === 'metNet') {
      // Do not silently carry a strength preset into a different activity.
      setMethod(isDistanceActivity(value) ? 'auto' : 'unknown')
    } else if (switchingToWalkRun && method === 'unknown') setMethod('auto')
    else if (switchingAway && method === 'auto') setMethod('unknown')
    if (value === 'Strength training') setStrength(true)
    else if (type === 'Strength training') setStrength(false)
  }

  function selectStrengthMet(value: string) {
    setStrengthMetChoice(value)
    setMet(value === 'custom' || !value ? ''
      : String(STRENGTH_MET_PRESETS.find(preset => preset.code === value)?.met ?? ''))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const activity = type === 'Other' ? custom : type
      if (effectiveMethod === 'metNet' && showStrengthMetPresets && !strengthMetChoice) {
        throw new Error('Choose a strength-training MET preset or Other MET before saving.')
      }
      if (walkRun && !hasTwoPaceInputs(pace)) {
        throw new Error('Enter at least two valid values: duration, distance, or speed.')
      }
      const inclineDegrees = walkRun ? parseNumber(incline, 'incline (°)', true) : null
      await saveExercise({
        dayKey: date,
        activity,
        durationMinutes: parseNumber(duration, 'duration', walkRun),
        distanceKm: walkRun ? parseNumber(distance, 'distance (km)', true) : null,
        speedKmh: walkRun ? parseNumber(speed, 'speed (km/h)', true) : null,
        inclinePercent: inclineDegrees === null ? null : degreesToGradePercent(inclineDegrees),
        intensity: editing?.intensity ?? null,
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
    <form onSubmit={event => { void submit(event) }} noValidate className="space-y-4">
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
          <input className={inputClass} type="number" inputMode="decimal" min="0.1" max="1440" step="any"
            value={duration} onChange={event => changePace('duration', event.target.value)} placeholder="e.g. 30" required />
        </label>
        {walkRun && <label className="block text-sm font-semibold">Distance (km)
          <input className={inputClass} type="number" inputMode="decimal" min="0.01" max="300" step="any"
            value={distance} onChange={event => changePace('distance', event.target.value)} placeholder="e.g. 3.5" required />
        </label>}
        {walkRun && <label className="block text-sm font-semibold">Speed (km/h)
          <input className={inputClass} type="number" inputMode="decimal" min={type === 'Walking' ? '2' : '6'}
            max={type === 'Walking' ? '8' : '25'} step="any" value={speed}
            onChange={event => changePace('speed', event.target.value)} placeholder="e.g. 5" required />
        </label>}
        {walkRun && <label className="block text-sm font-semibold">Incline (°, uphill only)
          <input className={inputClass} type="number" inputMode="decimal" min="0" max={MAX_INCLINE_DEGREES}
            step="any" value={incline} onChange={event => setIncline(event.target.value)}
            placeholder="Assume level ground" />
          <span className="mt-1 block text-xs font-normal text-slate-600">
            Enter the angle in degrees; 10° ≈ 17.6% grade. Blank assumes level ground for the estimate.
          </span>
        </label>}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={strength} onChange={event => setStrength(event.target.checked)} />
        Include this as a logged strength-training day
      </label>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-bold">Additional workout-energy estimate (optional)</legend>
        <p className="text-xs leading-5 text-slate-600">
          Estimates are incremental above rest. Manual calories must be ACTIVE, not total/gross. Formulas and assumptions are in Docs.
        </p>
        {!adult ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          This date has no confirmed adult age. Simple exercise logging is available, but adult-oriented energy estimates are not.
        </p> : <div className="space-y-2 text-sm">
          {walkRun && <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={method === 'auto'} onChange={() => setMethod('auto')} /> Estimate automatically (speed, incline, distance or time)</label>}
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={effectiveMethod === 'unknown'} onChange={() => setMethod('unknown')} /> No energy estimate</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={effectiveMethod === 'metNet'} onChange={() => setMethod('metNet')} /> Calculate net incremental kcal from a MET</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="exercise-method" checked={effectiveMethod === 'manualActive'} onChange={() => setMethod('manualActive')} /> Enter active/incremental kcal manually</label>
        </div>}
        {adult && effectiveMethod === 'metNet' && (showStrengthMetPresets
          ? <div className="space-y-3">
            <label className="block text-sm font-semibold">Strength-training MET preset
              <select className={inputClass} value={strengthMetChoice} onChange={event => selectStrengthMet(event.target.value)} required>
                <option value="">Choose strength exercise</option>
                {STRENGTH_MET_PRESETS.map(preset =>
                  <option key={preset.code} value={preset.code}>{preset.label} · {preset.met} MET</option>)}
                <option value="custom">Other MET (enter manually)</option>
              </select>
            </label>
            {strengthMetChoice === 'custom' && <label className="block text-sm font-semibold">Chosen activity MET (1–25)
              <input className={inputClass} type="number" min="1" max="25" step="any" inputMode="decimal" value={met}
                onChange={event => setMet(event.target.value)} placeholder="Enter a MET value" required />
            </label>}
          </div>
          : <label className="block text-sm font-semibold">Chosen activity MET (1–25)
            <input className={inputClass} type="number" min="1" max="25" step="any" inputMode="decimal" value={met}
              onChange={event => setMet(event.target.value)} placeholder="Enter a MET value" required />
          </label>)}
        {adult && effectiveMethod === 'manualActive' && <label className="block text-sm font-semibold">Active/incremental calories (kcal)
          <input className={inputClass} type="number" min="0" max="6000" step="any" inputMode="decimal" value={manual} onChange={event => setManual(event.target.value)} required placeholder="Active kcal only" />
        </label>}
      </fieldset>
      <label className="block text-sm font-semibold">Notes (optional, max 500 characters)
        <textarea className={inputClass} rows={2} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} />
      </label>
      <section role="status" aria-live="polite" aria-atomic="true"
        className="rounded-xl border border-evergreen-200 bg-evergreen-50 p-4">
        <h4 className="text-sm font-semibold text-evergreen-900">Estimated additional burned kcal</h4>
        <p className="mt-1 text-2xl font-bold tabular-nums text-evergreen-900">{weights === undefined ? 'Calculating…' : estimateText}</p>
        <p className="mt-1 text-xs text-evergreen-800">
          {!adult ? 'Adult-oriented estimate unavailable for this date.'
            : effectiveMethod === 'paceGradeNet' ? 'Based on pace, uphill grade and recorded weight.'
            : effectiveMethod === 'metNet' ? 'Based on supplied MET, time and recorded weight.'
            : effectiveMethod === 'manualActive' ? 'Manually entered active kcal.'
            : 'No estimate selected.'}
        </p>
      </section>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Save exercise'}</button>
        <button type="button" className={buttonClass} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export function ExerciseLog({ profile }: { profile: Profile }) {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [dayKey, setDayKey] = useState(() => selectedLogDay(searchParams.get('date')))
  const [adding, setAdding] = useState(() => searchParams.get('add') === 'exercise')
  const [editing, setEditing] = useState<ExerciseEntry | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState('')
  const activitiesForDay = useLiveQuery(() => listExerciseForDay(dayKey), [dayKey], undefined)
  const activitiesForWeek = useLiveQuery(() => listExerciseForWeek(dayKey), [dayKey], undefined)
  const weights = useLiveQuery(() => listWeights(), [], undefined)
  const adult = isAdult(profile, dayKey)

  async function remove(id: string) {
    setError('')
    try {
      await deleteExercise(id)
      if (editing?.id === id) setEditing(null)
      setConfirmDelete(null)
      toast.success('Exercise deleted.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this workout.')
    }
  }

  function startAdding() {
    setEditing(null)
    setAdding(true)
    setError('')
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
        onSaved={day => { setDayKey(day); setAdding(false); setEditing(null); toast.success('Exercise saved.') }}
        onCancel={() => { setAdding(false); setEditing(null) }} />}
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
                <p className="mt-1 text-xs text-slate-600">{entry.timeOfDay ? `${entry.timeOfDay} · ` : ''}{entry.durationMinutes === null ? 'Duration not recorded' : entry.durationMinutes + ' min'}{entry.distanceKm != null ? ' · ' + entry.distanceKm + ' km' : ''}{entry.speedKmh != null ? ' · ' + entry.speedKmh + ' km/h' : ''}{entry.inclinePercent != null ? ' · ' + Number(gradePercentToDegrees(entry.inclinePercent).toFixed(2)) + '° incline' : ''}{entry.isStrengthTraining ? ' · Strength' : ''}</p>
                <p className="mt-2 text-sm">
                  Additional workout kcal: {!adult ? 'Not evaluated (adult model)' : estimated?.kcal == null ? 'Unknown' : `≈ ${Number(estimated.kcal.toFixed(1))} kcal`}
                </p>
                {adult && estimated && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">{estimated.explanation}</p>}
                {entry.notes && <p className="mt-2 text-sm text-slate-700">{entry.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" className={buttonClass} onClick={() => { setAdding(false); setEditing(entry) }}>Edit</button>
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
