import type { DailySummary } from '../../domain/evaluation'
import { goalChecklist } from '../../domain/goalChecklist'
import { GoalStatusIcon } from './GoalStatusIcon'

/** Shared rule breakdown, revealed from the same radar on Today and Calendar day details. */
export function GoalChecklistRows({ summary, onDark = false }: { summary: DailySummary; onDark?: boolean }) {
  const items = goalChecklist(summary)
  return items.length === 0
    ? <p className={"mt-3 text-sm " + (onDark ? "text-white" : "text-slate-600")}>No daily goals configured.</p>
    : <ul aria-label="Daily goals" className={"mt-2 divide-y " + (onDark ? "divide-white/25 text-white" : "divide-slate-200")}>
        {items.map(item => <li key={item.code} className="flex items-start gap-2 py-3 text-sm leading-6">
          <GoalStatusIcon status={item.status} label={item.statusLabel} onDark={onDark} />
          <p className="min-w-0">
            <strong className="font-semibold">{item.label}</strong>
            {' '}<span className={"tabular-nums " + (onDark ? "text-white/90" : "text-slate-700")}>({item.comparison})</span>
          </p>
        </li>)}
      </ul>
}
