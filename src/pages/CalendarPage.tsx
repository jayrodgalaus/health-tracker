import { PageInfoLink } from '../components/PageInfoLink'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { monthDays, monthGrid, shiftMonth } from '../domain/calendar'
import { calculateDay, goalOnDay, type EvaluationStatus } from '../domain/evaluation'
import { readMonthRecords } from '../data/dayRepository'
import { parseLocalDay, toLocalDay } from '../lib/localDate'
import { DAY_STATUS } from '../features/day/DayAssessment'
import { calendarStatusFill } from '../features/day/calendarMonthPresentation'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function validMonth(candidate: string | null, fallback: string): string {
  if (!candidate) return fallback
  try { monthDays(candidate); return candidate } catch { return fallback }
}

export function CalendarPage({ profile }: { profile: Profile }) {
  const [params, setParams] = useSearchParams()
  const today = toLocalDay(new Date())
  const month = validMonth(params.get('month'), today.slice(0, 7))
  const data = useLiveQuery(() => readMonthRecords(month), [month], undefined)
  const rows = useMemo(() => monthGrid(month), [month])
  const title = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
    .format(parseLocalDay(month + '-01')!)
  const evaluated = useMemo(() => {
    if (!data) return null
    const results = new Map<string, { status: EvaluationStatus; completed: boolean }>()
    const calculatedAt = new Date().toISOString()
    for (const day of monthDays(month)) {
      const intake = data.intake.filter(entry => entry.dayKey === day)
      const activities = data.activities.filter(entry => entry.dayKey === day)
      const summary = calculateDay({
        dayKey: day, profile, intake, activities, weights: data.weights,
        goal: goalOnDay(day, data.goals),
        review: data.reviews.find(review => review.dayKey === day) ?? null
      }, calculatedAt)
      results.set(day, {
        status: summary.evaluation.status,
        completed: summary.evaluation.isComplete
      })
    }
    return results
  }, [data, month, profile])

  function navigateMonth(offset: number) {
    const next = shiftMonth(month, offset)
    if (next >= '1900-01' && next <= '2100-12') setParams({ month: next })
  }

  return (
    <div className="space-y-6">
      <header>
        <PageInfoLink topic="calendar" />
        <h1 className="text-3xl font-bold tracking-tight">Your recorded days</h1>
      </header>

      <section aria-label="Month navigation" className="flex w-full items-center gap-2">
        <button type="button" aria-label="Previous month" onClick={() => navigateMonth(-1)}
          disabled={month <= '1900-01'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-semibold disabled:opacity-40">
          ‹
        </button>
        <div className="relative flex min-w-0 flex-1 items-center justify-center rounded-xl focus-within:ring-2 focus-within:ring-evergreen-600">
          <h2 className="pointer-events-none inline-flex min-h-11 items-center justify-center gap-1 text-center text-lg font-bold"
            aria-live="polite">
            {title}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-slate-500"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </h2>
          <input type="month" aria-label="Choose month" title="Choose month"
            min="1900-01" max="2100-12" value={month}
            onChange={event => setParams({ month: validMonth(event.target.value, month) })}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </div>
        <button type="button" aria-label="Next month" onClick={() => navigateMonth(1)}
          disabled={month >= '2100-12'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-semibold disabled:opacity-40">
          ›
        </button>
      </section>

      {data === undefined
        ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading calendar entries…</p>
        : <section aria-label={title + ' monthly calendar'} className="w-full">
          <div className="grid grid-cols-7 gap-1 border-b border-slate-200 pb-2">
            {weekdayLabels.map(label =>
              <span key={label} className="py-2 text-center text-xs font-semibold text-slate-500">{label}</span>)}
          </div>
          <div className="mt-2 space-y-1">
            {rows.map((row, index) =>
              <div key={index} className="grid grid-cols-7 gap-1">
                {row.map((day, cell) => {
                  if (!day) return <span key={'empty-' + cell} aria-hidden="true" className="min-h-14" />
                  const entry = evaluated?.get(day)
                  const completed = entry?.completed ?? false
                  const status = entry?.status ?? 'incomplete'
                  const ariaLabel = day + ': ' + (completed
                    ? 'completed, ' + DAY_STATUS[status].label : 'not completed')
                  return <Link key={day} to={'/calendar/' + day} aria-label={ariaLabel}
                    className="flex min-h-14 min-w-0 items-center justify-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-600">
                    <span className={'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors sm:h-11 sm:w-11 sm:text-base ' +
                      calendarStatusFill(status, completed) +
                      (day === today ? ' ring-2 ring-inset ring-evergreen-700' : '')}>
                      {Number(day.slice(-2))}
                    </span>
                  </Link>
                })}
              </div>)}
          </div>
        </section>}
    </div>
  )
}
