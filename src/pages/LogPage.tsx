import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { db } from '../db/database'
import { PageTitle } from '../components/PageTitle'
import { WeekDateNavigation } from '../components/WeekDateNavigation'
import { LogActionPill } from '../components/LogActionPill'
import { DayCompletionControl } from '../features/day/DayCompletionControl'
import { selectedLogDay } from '../lib/logDate'
import { toLocalDay } from '../lib/localDate'

export function LogPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const dayKey = selectedLogDay(searchParams.get('date'))
  const today = toLocalDay(new Date())
  const legacyAction = searchParams.get('add')
  // A missing review is a loaded, not-yet-completed day (null), not a pending query (undefined).
  const review = useLiveQuery(async () => (await db.dayReviews.get(dayKey)) ?? null, [dayKey], undefined)
  const locked = review?.isComplete === true
  const actionDate = '?date=' + encodeURIComponent(dayKey)

  // Older links used ?add=... or #weight on the combined Log screen.
  if (legacyAction && ['food', 'drink', 'exercise', 'weight', 'water'].includes(legacyAction)) {
    const route = legacyAction === 'water' ? 'drink' : legacyAction
    return <Navigate to={'/log/' + route + actionDate + (legacyAction === 'water' ? '&water=1' : '')} replace />
  }
  if (location.hash === '#weight') return <Navigate to={'/log/weight' + actionDate} replace />

  return <div className="space-y-6">
    <header>
      
      <PageTitle topic="log">Log</PageTitle>
      <div className="mt-4">
        <WeekDateNavigation selectedDay={dayKey} today={today} destination="log" />
      </div>
    </header>

    {review === undefined ? <p role="status" className="rounded-xl bg-white p-4 text-sm">Loading day status…</p> :
      locked ? <section aria-label="Locked day" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Day complete · Read only</h2>
        <p className="text-sm text-slate-600">Food, drinks, exercise and weight are locked. The archived daily goal alignment remains unchanged when Settings targets change.</p>
        <Link className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 underline" to={'/calendar/' + dayKey}>
          View locked day details
        </Link>
        <div className="flex justify-center">
          <DayCompletionControl dayKey={dayKey} isComplete />
        </div>
      </section> : <>
        <nav aria-label="Log entry types" className="flex flex-col gap-3">
          <LogActionPill kind="food" to={'/log/food' + actionDate} />
          <LogActionPill kind="drink" to={'/log/drink' + actionDate} />
          <LogActionPill kind="exercise" to={'/log/exercise' + actionDate} />
          <LogActionPill kind="weight" to={'/log/weight' + actionDate} />
          <LogActionPill kind="saved" to={'/log/saved-foods' + actionDate} />
        </nav>
        <div className="flex justify-center">
          <DayCompletionControl dayKey={dayKey} isComplete={false} />
        </div>
      </>}
    {locked && <LogActionPill kind="saved" to={'/log/saved-foods' + actionDate} />}
  </div>
}
