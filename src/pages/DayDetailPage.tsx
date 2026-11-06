import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { addLocalDays } from '../domain/calendar'
import { calculateDay } from '../domain/evaluation'
import { readDayRecords } from '../data/dayRepository'
import { listExerciseForWeek } from '../data/exerciseRepository'
import { parseLocalDay, toLocalDay } from '../lib/localDate'
import { DayAssessment } from '../features/day/DayAssessment'
import { ExpenditurePanel } from '../features/day/ExpenditurePanel'
import { DayEntries } from '../features/day/DayEntries'
import { NutritionSummary } from '../features/nutrition/NutritionSummary'
import { ActivitySummary } from '../features/exercise/ActivitySummary'

export function DayDetailPage({ profile }: { profile: Profile }) {
  const { dayKey: param } = useParams()
  const dayKey = param && parseLocalDay(param) && param >= '1900-01-01' && param <= '2100-12-31' ? param : null
  const records = useLiveQuery(() => dayKey ? readDayRecords(dayKey) : Promise.resolve(null), [dayKey], undefined)
  const week = useLiveQuery(() => dayKey ? listExerciseForWeek(dayKey) : Promise.resolve([]), [dayKey], undefined)
  if (!dayKey) return <div role="alert" className="rounded-xl bg-rose-50 p-5">
    Invalid calendar day. <Link className="text-evergreen-700 underline" to="/calendar">Return to calendar</Link>.
  </div>
  const summary = records ? calculateDay({ dayKey, profile, ...records }, new Date().toISOString()) : undefined
  const previous = addLocalDays(dayKey, -1)
  const next = addLocalDays(dayKey, 1)
  const last = toLocalDay(new Date())
  return <div className="space-y-7">
    <header className="space-y-3">
      <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/calendar?month=' + dayKey.slice(0, 7)}>Back to {dayKey.slice(0, 7)} calendar</Link>
      <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Day detail · Phase 2</p>
      <h1 className="text-3xl font-bold tracking-tight">{dayKey}</h1>
      <nav aria-label="Nearby dates" className="flex flex-wrap gap-3">
        <Link to={'/calendar/' + previous} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">‹ Previous day</Link>
        <Link to={'/calendar/' + last} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Today</Link>
        {dayKey < '2100-12-31' && <Link to={'/calendar/' + next} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Next day ›</Link>}
      </nav>
    </header>
    {records === undefined && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading records for {dayKey}…</p>}
    <DayAssessment summary={summary} fullRules />
    <ExpenditurePanel summary={summary} />
    <NutritionSummary entries={records?.intake} />
    <ActivitySummary dayKey={dayKey} profile={profile} dayActivities={records?.activities} weekActivities={week} weights={records?.weights} />
    {records && <DayEntries dayKey={dayKey} profile={profile} records={records} />}
  </div>
}
