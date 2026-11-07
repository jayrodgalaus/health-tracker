import { Link } from 'react-router-dom'
import type { FoodEntry, Profile } from '../../domain/models'
import { reniPercent, reniReferenceForDay } from '../../domain/reni'
import { knownAmountPercent, type NutrientComparisonLimits } from '../../domain/nutrientLimits'
import { aggregateIntake, type MetricCoverage } from '../../domain/nutrition'
import { NUTRIENT_LABELS } from './NutritionFields'
import { DISPLAY_NUTRIENT_FIELDS, nutrientUnit } from './nutrientDisplay'

function metricLabel(metric: MetricCoverage, unit: string): string {
  if (metric.knownAmount === null) return '-'
  const amount = Number(metric.knownAmount.toFixed(1)).toLocaleString()
  return `${metric.complete ? '' : 'At least '}${amount} ${unit}`
}

export function NutritionSummary({
  entries, loading = false, reniProfile, reniDayKey, comparisonLimits, detailDayKey
}: {
  entries?: readonly FoodEntry[]
  loading?: boolean
  /** Only Calendar day details request FNRI comparisons; Today retains logged-only totals. */
  reniProfile?: Profile
  reniDayKey?: string
  comparisonLimits?: NutrientComparisonLimits
  /** Allows the nutrient cards to link to a selected day's per-entry breakdown. */
  detailDayKey?: string
}) {
  if (loading || entries === undefined) {
    return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading recorded nutrition…</p>
  }
  const summary = aggregateIntake(entries)
  const primary = [
    { name: 'Calories consumed', metric: summary.nutrients.energyKcal, unit: 'kcal' },
    { name: 'Logged fluids', metric: summary.fluids, unit: 'ml' }
  ]
  const selectedDay = detailDayKey ?? reniDayKey
  return (
    <section aria-labelledby="nutrition-summary-title" className="space-y-3">
      <div>
        <h2 id="nutrition-summary-title" className="text-lg font-bold">Recorded nutrition and fluids</h2>
        <p className="mt-1 text-sm text-slate-600">
          {summary.entries ? `${summary.foods} foods · ${summary.beverages} drinks/water entries` : 'Nothing logged on this date'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {primary.map(item => (
          <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-600">{item.name}</h3>
            <p className="mt-3 text-xl font-bold">{metricLabel(item.metric, item.unit)}</p>
          </div>
        ))}
      </div>
      {summary.nutrients.energyKcal.totalEntryCount > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Nutrients</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DISPLAY_NUTRIENT_FIELDS.map(field => {
              const metric = summary.nutrients[field]
              const usesCustomLimit = field === 'carbohydratesG' || field === 'sugarsG' || field === 'sodiumMg'
              const reference = !usesCustomLimit && reniProfile && reniDayKey
                ? reniReferenceForDay(field, reniProfile, reniDayKey) : null
              const customLimit = usesCustomLimit && reniProfile && reniDayKey
                ? (field === 'carbohydratesG' ? comparisonLimits?.carbohydratesG
                    : field === 'sugarsG' ? comparisonLimits?.sugarsG : comparisonLimits?.sodiumMg) ?? null : null
              const percentage = usesCustomLimit
                ? knownAmountPercent(metric, customLimit)
                : reniPercent(metric, reference)
              const content = <>
                <span className="text-sm font-semibold text-slate-600">{NUTRIENT_LABELS[field]}</span>
                <span className="mt-2 block break-words text-base font-bold tabular-nums text-slate-900">
                  {metricLabel(metric, nutrientUnit(field))}
                  {percentage !== null && <span>{' '}({metric.complete ? '' : '≥'}{percentage.toFixed(1)}%)</span>}
                </span>
              </>
              const classes = 'relative block min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-3'
              return selectedDay
                ? <Link key={field} to={`/calendar/${selectedDay}/nutrients/${field}`}
                    className={classes + ' pr-5 transition-colors hover:border-evergreen-500 hover:bg-evergreen-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700'}>
                    {content}
                    <span aria-hidden="true" className="absolute right-2 top-3 text-slate-400">›</span>
                  </Link>
                : <div key={field} className={classes}>{content}</div>
            })}
          </div>
        </div>
      )}
    </section>
  )
}
