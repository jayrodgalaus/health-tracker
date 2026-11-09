import { PageInfoLink } from '../components/PageInfoLink'
import { WeekDateNavigation } from '../components/WeekDateNavigation'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { calculateDay } from '../domain/evaluation'
import { readDayRecords } from '../data/dayRepository'
import { parseLocalDay, toLocalDay } from '../lib/localDate'
import { CalendarGoalChecklist } from '../features/day/CalendarGoalChecklist'
import { DailyGoalRadar } from '../features/day/DailyGoalRadar'
import { CalendarSectionCards } from '../features/day/CalendarSectionCards'
import { DayCompletionControl } from '../features/day/DayCompletionControl'

/** Shared day overview, used unchanged by Calendar and by Today's current local date. */
export function DayDetailPage({
  profile, selectedDayKey
}: { profile: Profile; selectedDayKey?: string }) {
  const { dayKey: routeDayKey } = useParams()
  const requested = selectedDayKey ?? routeDayKey
  const dayKey = requested && parseLocalDay(requested) &&
    requested >= '1900-01-01' && requested <= '2100-12-31' ? requested : null
  const last = toLocalDay(new Date())
  const records = useLiveQuery(
    () => dayKey && dayKey <= last ? readDayRecords(dayKey) : Promise.resolve(null),
    [dayKey, last], undefined
  )
  if (!dayKey) return <div role="alert" className="rounded-xl bg-rose-50 p-5">
    Invalid calendar day. <Link className="text-evergreen-700 underline" to="/calendar">Return to calendar</Link>.
  </div>
  if (dayKey > last) return <div role="alert" className="rounded-xl bg-rose-50 p-5 text-rose-900">
    Future dates are not selectable. <Link className="font-semibold underline" to="/calendar">Return to calendar</Link>.
  </div>
  const locked = records?.review?.isComplete === true
  const summary = records ? calculateDay({ dayKey, profile, ...records }, new Date().toISOString()) : undefined
  return <div className="space-y-7">
    <header className="space-y-3">
      <PageInfoLink topic="day-detail" />
      <Link className="text-sm font-semibold text-evergreen-700 underline" to={'/calendar?month=' + dayKey.slice(0, 7)}>Back to {dayKey.slice(0, 7)} calendar</Link>
      <h1 className="sr-only">Day details for {dayKey}</h1>
      <WeekDateNavigation selectedDay={dayKey} today={last} />
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
    {selectedDayKey ? <DailyGoalRadar summary={summary} /> : <CalendarGoalChecklist summary={summary} />}
    {records && <CalendarSectionCards dayKey={dayKey} summary={summary}
      massUnit={records.review?.isComplete && records.review.frozen
        ? records.review.frozen.profile.units.mass : profile.units.mass} />}
  </div>
}
