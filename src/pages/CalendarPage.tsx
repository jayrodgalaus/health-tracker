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

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
function validMonth(candidate: string | null, fallback: string): string {
  if (!candidate) return fallback
  try { monthDays(candidate); return candidate } catch { return fallback }
}
function statusCard(status: EvaluationStatus) {
  return status === 'onTarget' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' :
    status === 'mixed' ? 'border-amber-300 bg-amber-50 text-amber-950' :
      status === 'offTarget' ? 'border-rose-300 bg-rose-50 text-rose-900' :
        'border-slate-200 bg-white text-slate-700'
}

export function CalendarPage({ profile }: { profile: Profile }) {
  const [params, setParams] = useSearchParams()
  const today = toLocalDay(new Date())
  const month = validMonth(params.get('month'), today.slice(0, 7))
  const data = useLiveQuery(() => readMonthRecords(month), [month], undefined)
  const rows = useMemo(() => monthGrid(month), [month])
  const title = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(parseLocalDay(month + '-01')!)
  const evaluated = useMemo(() => {
    if (!data) return null
    const results = new Map<string, { status: EvaluationStatus; intake: number; exercise: number; hasWeight: boolean }>()
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
        intake: summary.intake.entries, exercise: summary.activity.entries,
        hasWeight: summary.recordedWeightKg !== null
      })
    }
    return results
  }, [data, month, profile])
  function navigateMonth(offset: number) {
    const next = shiftMonth(month, offset)
    if (next >= '1900-01' && next <= '2100-12') setParams({ month: next })
  }
  const statusCounts = { onTarget: 0, mixed: 0, offTarget: 0, incomplete: 0 }
  evaluated?.forEach(item => { statusCounts[item.status]++ })

  return (
    <div className="space-y-6">
      <header>
      <PageInfoLink topic="calendar" />
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Calendar · Phase 2</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Your recorded days</h1>
        </header>
      <section aria-label="Month navigation" className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" aria-label="Previous month" onClick={() => navigateMonth(-1)}
          disabled={month <= '1900-01'} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold disabled:opacity-40">‹ <span className="sr-only">Previous</span></button>
        <h2 className="text-xl font-bold" aria-live="polite">{title}</h2>
        <button type="button" aria-label="Next month" onClick={() => navigateMonth(1)}
          disabled={month >= '2100-12'} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold disabled:opacity-40"><span className="sr-only">Next</span> ›</button>
      </section>
      <div className="flex flex-wrap justify-between gap-3">
        <label className="text-sm font-semibold">Go to month
          <input className="ml-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3" type="month"
            min="1900-01" max="2100-12" value={month}
            onChange={event => setParams({ month: validMonth(event.target.value, month) })} />
        </label>
        <button type="button" className="min-h-11 rounded-xl border border-evergreen-600 px-4 text-sm font-semibold text-evergreen-700"
          onClick={() => setParams({ month: today.slice(0, 7) })}>Current month</button>
      </div>
      {data === undefined ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading calendar entries…</p> :
        <section aria-label={title + ' monthly calendar'} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="min-w-[336px] space-y-1">
            <div className="grid grid-cols-7 gap-1">
              {weekdayLabels.map(label => <span key={label} className="py-2 text-center text-xs font-semibold text-slate-500">{label}</span>)}
            </div>
            {rows.map((row, index) => <div key={index} className="grid grid-cols-7 gap-1">
              {row.map((day, cell) => {
                if (!day) return <span key={'empty-' + cell} aria-hidden="true" className="min-h-16" />
                const status = evaluated?.get(day)
                const code = status?.status ?? 'incomplete'
                const badge = DAY_STATUS[code]
                const indicators = [status?.intake ? status.intake + ' food/drink' : null,
                  status?.exercise ? status.exercise + ' exercise' : null, status?.hasWeight ? 'weight' : null].filter(Boolean)
                const ariaLabel = day + ': ' + badge.label +
                  (indicators.length ? ', ' + indicators.join(', ') : ', no entries')
                return <Link key={day} to={'/calendar/' + day}
                  aria-label={ariaLabel} title={ariaLabel}
                  className={'flex min-h-20 flex-col items-center justify-start rounded-xl border py-2 text-center transition-colors hover:ring-2 hover:ring-evergreen-500 ' +
                    statusCard(code) + (day === today ? ' ring-2 ring-evergreen-700' : '')}>
                  <span className="text-sm font-bold">{Number(day.slice(-2))}</span>
                  <span aria-hidden="true" className="mt-1 text-xs font-bold">{badge.symbol}</span>
                  <span className="mt-1 text-[10px] font-semibold">{badge.short}</span>
                  <span aria-hidden="true" className="mt-1 text-[10px]">{status?.intake ? '●' : ''}{status?.exercise ? '◆' : ''}{status?.hasWeight ? '▴' : ''}</span>
                </Link>
              })}
            </div>)}
          </div>
        </section>}
      <section aria-labelledby="calendar-legend-heading" className="rounded-2xl bg-white p-4">
        <h3 id="calendar-legend-heading" className="font-semibold">Status legend</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {(Object.keys(DAY_STATUS) as EvaluationStatus[]).map(key =>
            <p key={key} className={'rounded-lg border p-2 ' + DAY_STATUS[key].className}><span aria-hidden="true">{DAY_STATUS[key].symbol}</span> {DAY_STATUS[key].label}</p>)}
        </div>
        {evaluated && <p className="mt-3 text-sm text-slate-600" aria-label="Month status counts">
          {statusCounts.onTarget} on target · {statusCounts.mixed} mixed · {statusCounts.offTarget} off target · {statusCounts.incomplete} incomplete / unassessed
        </p>}
      </section>
    </div>
  )
}
