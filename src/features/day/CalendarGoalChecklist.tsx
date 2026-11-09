import type { DailySummary } from '../../domain/evaluation'
import { goalChecklist } from '../../domain/goalChecklist'
import { GoalStatusIcon } from './GoalStatusIcon'

/** Shared text breakdown; Today hides it until the radar chart is activated. */
export function GoalChecklistRows({ summary }: { summary: DailySummary }) {
  const items = goalChecklist(summary)
  return items.length === 0
    ? <p className="mt-3 text-sm text-slate-600">No daily goals configured.</p>
    : <ul aria-label="Daily goals" className="mt-2 divide-y divide-slate-200">
        {items.map(item => <li key={item.code} className="flex items-start gap-2 py-3 text-sm leading-6">
          <GoalStatusIcon status={item.status} label={item.statusLabel} />
          <p className="min-w-0">
            <strong className="font-semibold">{item.label}</strong>
            {' '}<span className="tabular-nums text-slate-700">({item.comparison})</span>
          </p>
        </li>)}
      </ul>
}

/** Calendar retains its existing plain checklist, statuses and rule details. */
export function CalendarGoalChecklist({ summary }: { summary?: DailySummary }) {
  if (!summary) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading day evaluation…</p>
  return <section aria-labelledby="day-assessment-heading"
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 id="day-assessment-heading" className="text-lg font-bold">Daily goal alignment</h2>
    <GoalChecklistRows summary={summary} />
  </section>
}
