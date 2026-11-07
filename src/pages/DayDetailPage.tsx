import { PageInfoLink } from '../components/PageInfoLink'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { addLocalDays } from '../domain/calendar'
import { calculateDay } from '../domain/evaluation'
import { readDayRecords } from '../data/dayRepository'
import { parseLocalDay, toLocalDay } from '../lib/localDate'
import { CalendarGoalChecklist } from '../features/day/CalendarGoalChecklist'
import { CalendarSectionCards } from '../features/day/CalendarSectionCards'
import { DayCompletionControl } from '../features/day/DayCompletionControl'

export function DayDetailPage({ profile }: { profile: Profile }) {
  const { dayKey: param } = useParams()
  const dayKey = param && parseLocalDay(param) && param >= '1900-01-01' && param <= '2100-12-31' ? param : null
  const records = useLiveQuery(() => dayKey ? readDayRecords(dayKey) : Promise.resolve(null), [dayKey], undefined)
  if (!dayKey) return <div role="alert" className="rounded-xl bg-rose-50 p-5">
    Invalid calendar day. <Link className="text-evergreen-700 underline" to="/calendar">Return to calendar</Link>.
  </div>
  const locked = records?.review?.isComplete === true
  const summary = records ? calculateDay({ dayKey, profile, ...records }, new Date().toISOString()) : undefined
  const previous = addLocalDays(dayKey, -1)
  const next = addLocalDays(dayKey, 1)
  const last = toLocalDay(new Date())
  return <div className="space-y-7">
    <header className="space-y-3">
      <PageInfoLink topic="day-detail" />
      <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/calendar?month=' + dayKey.slice(0, 7)}>Back to {dayKey.slice(0, 7)} calendar</Link>
      <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Day detail · Phase 2</p>
      <h1 className="text-3xl font-bold tracking-tight">{dayKey}</h1>
      <nav aria-label="Nearby dates" className="flex w-full flex-nowrap gap-2">
        {dayKey > '1900-01-01'
          ? <Link to={'/calendar/' + previous} aria-label="Previous day"
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-1 text-center text-sm font-semibold">
              ‹ Previous<span className="hidden sm:inline">&nbsp;day</span>
            </Link>
          : <span aria-hidden="true" className="min-w-0 flex-1" />}
        <Link to={'/calendar/' + last}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-1 text-center text-sm font-semibold">
          Today
        </Link>
        {dayKey < '2100-12-31'
          ? <Link to={'/calendar/' + next} aria-label="Next day"
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-1 text-center text-sm font-semibold">
              Next<span className="hidden sm:inline">&nbsp;day</span> ›
            </Link>
          : <span aria-hidden="true" className="min-w-0 flex-1" />}
      </nav>
    </header>
    {records === undefined && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading records for {dayKey}…</p>}
    {summary && <section aria-label="Day completion status"
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="min-w-0 text-sm font-semibold text-slate-800">
        {locked ? 'Day completed.' : 'Day not completed.'}
      </p>
      {dayKey <= last && <DayCompletionControl key={dayKey} dayKey={dayKey}
        isComplete={locked} compact />}
    </section>}
    <CalendarGoalChecklist summary={summary} />
    {records && <CalendarSectionCards dayKey={dayKey} summary={summary} />}
  </div>
}
