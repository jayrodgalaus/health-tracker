import { PageInfoLink } from '../components/PageInfoLink'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import type { Profile } from '../domain/models'
import { calculateDay } from '../domain/evaluation'
import { addLocalDays } from '../domain/calendar'
import { readDayRecords } from '../data/dayRepository'
import { listExerciseForWeek } from '../data/exerciseRepository'
import { parseLocalDay, toLocalDay } from '../lib/localDate'
import { ActivitySummary } from '../features/exercise/ActivitySummary'
import { NutritionSummary } from '../features/nutrition/NutritionSummary'
import { DayAssessment } from '../features/day/DayAssessment'
import { ExpenditurePanel } from '../features/day/ExpenditurePanel'
import { DayEntries } from '../features/day/DayEntries'
import { kilogramsTo } from '../domain/units'

export function TodayPage({ profile }: { profile: Profile }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = toLocalDay(new Date())
  const selected = searchParams.get('date')
  const dayKey = selected && parseLocalDay(selected) && selected >= '1900-01-01' && selected <= today ? selected : today
  const records = useLiveQuery(() => readDayRecords(dayKey), [dayKey], undefined)
  const week = useLiveQuery(() => listExerciseForWeek(dayKey), [dayKey], undefined)
  const summary = records ? calculateDay({ dayKey, profile, ...records }, new Date().toISOString()) : undefined
  const recordedWeight = summary?.recordedWeightKg
  const latest = summary?.expenditure.weight

  function changeDay(next: string) {
    if (parseLocalDay(next) && next >= '1900-01-01' && next <= today) {
      setSearchParams(next === today ? {} : { date: next })
    }
  }

  const dateQuery = '?date=' + encodeURIComponent(dayKey)
  return <div className="space-y-7">
    <header className="space-y-3">
      <PageInfoLink topic="today" />
      <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">{dayKey === today ? 'Today' : 'Historical day'} · {dayKey}</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your day, your pace.</h1>
      <div className="flex flex-wrap items-end gap-2" aria-label="Day navigation">
        <button type="button" aria-label="Previous day" className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold"
          onClick={() => changeDay(addLocalDays(dayKey, -1))}>‹</button>
        <label className="text-xs font-semibold text-slate-600">Date
          <input className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base" type="date"
            min="1900-01-01" max={today} value={dayKey} onChange={event => changeDay(event.target.value)} />
        </label>
        <button type="button" aria-label="Next day" disabled={dayKey >= today}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold disabled:opacity-40"
          onClick={() => changeDay(addLocalDays(dayKey, 1))}>›</button>
        {dayKey !== today && <button type="button" className="min-h-11 rounded-xl border border-evergreen-600 px-4 text-sm font-semibold text-evergreen-700"
          onClick={() => changeDay(today)}>Today</button>}
      </div>
    </header>
    <section aria-label="Quick logging actions" className="flex flex-wrap gap-2">
      <Link to={'/log/food' + dateQuery} className="inline-flex min-h-11 items-center rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white">+ Food</Link>
      <Link to={'/log/drink' + dateQuery} className="inline-flex min-h-11 items-center rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white">+ Drink</Link>
      <Link to={'/log/drink' + dateQuery + '&water=1'} className="inline-flex min-h-11 items-center rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white">+ Water</Link>
      <Link to={'/log/exercise' + dateQuery} className="inline-flex min-h-11 items-center rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white">+ Exercise</Link>
      <Link to={'/log' + dateQuery + '#weight'} className="inline-flex min-h-11 items-center rounded-xl border border-evergreen-600 px-4 py-2 text-sm font-semibold text-evergreen-700">+ Weight</Link>
    </section>
    <ExpenditurePanel summary={summary} />
    <NutritionSummary entries={records?.intake} detailDayKey={dayKey} />
    <ActivitySummary dayKey={dayKey} profile={profile} dayActivities={records?.activities} weekActivities={week} weights={records?.weights} />
    <DayAssessment summary={summary} />
    <section aria-labelledby="weight-card-title" className="rounded-2xl bg-evergreen-900 p-5 text-white">
      <h2 id="weight-card-title" className="font-semibold">Measured weight</h2>
      <p className="mt-2 text-xl font-bold">{recordedWeight == null ? 'Not recorded for this day'
        : Number(kilogramsTo(recordedWeight, profile.units.mass).toFixed(2)) + ' ' + profile.units.mass}</p>
      <p className="mt-2 text-xs leading-5 text-emerald-50">{latest?.source === 'carriedForward'
        ? 'Most recent earlier measured weight: ' + Number(kilogramsTo(latest.weightKg!, profile.units.mass).toFixed(2)) +
          ' ' + profile.units.mass + ' on ' + latest.sourceDay + ' (not a measurement for this day).'
        : 'Missing measured dates are not filled in.'}</p>
      <Link to={'/log' + dateQuery + '#weight'} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-evergreen-900">Add / edit weight</Link>
    </section>
    {records && <DayEntries dayKey={dayKey} records={records} profile={profile} />}
    <Link to={'/calendar/' + dayKey} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-evergreen-700">Open full day detail and rule explanations</Link>
  </div>
}
