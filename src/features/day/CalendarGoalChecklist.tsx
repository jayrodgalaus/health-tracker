import type { DailySummary } from '../../domain/evaluation'
import { goalChecklist } from '../../domain/goalChecklist'

/** Calendar-only compact view. Full rule methodology lives in Settings → Docs. */
export function CalendarGoalChecklist({ summary }: { summary?: DailySummary }) {
  if (!summary) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading day evaluation…</p>
  const items = goalChecklist(summary)
  return <section aria-labelledby="day-assessment-heading"
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 id="day-assessment-heading" className="text-lg font-bold">Daily goal alignment</h2>
    {items.length === 0
      ? <p className="mt-3 text-sm text-slate-600">No daily goals configured.</p>
      : <ul aria-label="Daily goals" className="mt-2 divide-y divide-slate-100">
        {items.map(item => <li key={item.code} className="flex items-start gap-2 py-3 text-sm leading-6">
          <span role="img" aria-label={item.statusLabel} className="shrink-0 text-lg">{item.icon}</span>
          <p className="min-w-0">
            <strong className="font-semibold">{item.label}</strong>
            {' '}<span className="tabular-nums text-slate-700">({item.comparison})</span>
          </p>
        </li>)}
      </ul>}
  </section>
}
