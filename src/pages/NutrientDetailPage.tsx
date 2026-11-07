import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { PageInfoLink } from '../components/PageInfoLink'
import { listIntakeForDay } from '../data/intakeRepository'
import type { FoodEntry } from '../domain/models'
import { aggregateIntake } from '../domain/nutrition'
import { NUTRIENT_LABELS } from '../features/nutrition/NutritionFields'
import {
  formatEntryNutrient, isDisplayNutrientField, type DisplayNutrientField
} from '../features/nutrition/nutrientDisplay'
import { parseLocalDay } from '../lib/localDate'

function IntakeGroup({
  title, entries, field, dayKey
}: {
  title: string
  entries: readonly FoodEntry[]
  field: DisplayNutrientField
  dayKey: string
}) {
  const dateQuery = '?date=' + encodeURIComponent(dayKey)
  return <section className="space-y-3" aria-label={title}>
    <h2 className="text-lg font-semibold">{title} ({entries.length})</h2>
    {entries.length === 0 ? <p className="text-sm text-slate-500">No entries.</p> :
      <ul className="space-y-2">
        {entries.map(entry => {
          const amount = entry.nutrientsSnapshot[field]
          return <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-slate-900">{entry.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {entry.quantity} {entry.unit}{entry.kind === 'food' && entry.meal ? ' · ' + entry.meal : ''}
                </p>
                <Link className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-evergreen-700 underline"
                  to={`/log/${entry.kind === 'food' ? 'food' : 'drink'}${dateQuery}&edit=${encodeURIComponent(entry.id)}`}>
                  Edit entry
                </Link>
              </div>
              <span className="shrink-0 text-right text-base font-bold tabular-nums text-slate-900"
                aria-label={amount === null || amount === undefined ? 'Unknown nutrient amount' : undefined}>
                {formatEntryNutrient(amount, field)}
              </span>
            </div>
          </li>
        })}
      </ul>}
  </section>
}

export function NutrientDetailPage() {
  const { dayKey: paramDay, field: paramField } = useParams()
  const dayKey = paramDay && parseLocalDay(paramDay) &&
    paramDay >= '1900-01-01' && paramDay <= '2100-12-31' ? paramDay : null
  const field = isDisplayNutrientField(paramField) ? paramField : null
  const entries = useLiveQuery(
    () => dayKey && field ? listIntakeForDay(dayKey) : Promise.resolve([]),
    [dayKey, field], undefined
  )

  if (!dayKey || !field) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5">
      Invalid date or nutrient. <Link className="text-evergreen-700 underline" to="/calendar">Return to calendar</Link>.
    </div>
  }

  const nutrient = NUTRIENT_LABELS[field]
  const summary = entries ? aggregateIntake(entries).nutrients[field] : undefined
  const total = summary && summary.knownAmount !== null
    ? `${summary.complete ? '' : 'At least '}${formatEntryNutrient(summary.knownAmount, field)}` : '-'
  const foods = entries?.filter(entry => entry.kind === 'food') ?? []
  const drinks = entries?.filter(entry => entry.kind === 'beverage') ?? []

  return <div className="space-y-6">
    <header className="space-y-2">
      <PageInfoLink topic="nutrition" />
      <Link to={'/calendar/' + dayKey}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline">
        ‹ Back to day details
      </Link>
      <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">{dayKey}</p>
      <h1 className="text-3xl font-bold tracking-tight">{nutrient}</h1>
    </header>
    {entries === undefined ? <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">
      Loading recorded entries…
    </p> : <>
      <section aria-label="Recorded nutrient total" className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-600">Recorded total</h2>
        <p className="mt-2 text-2xl font-bold tabular-nums">{total}</p>
      </section>
      {entries.length === 0 ?
        <p className="rounded-xl bg-white p-4 text-sm text-slate-600">No foods or drinks recorded for this date.</p> :
        <div className="space-y-6">
          <IntakeGroup title="Foods" entries={foods} field={field} dayKey={dayKey} />
          <IntakeGroup title="Drinks and water" entries={drinks} field={field} dayKey={dayKey} />
        </div>}
    </>}
  </div>
}
