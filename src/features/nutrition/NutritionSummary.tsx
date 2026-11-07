import { Link } from 'react-router-dom'
import type { FoodEntry, Profile } from '../../domain/models'
import { reniPercent, reniReferenceForDay } from '../../domain/reni'
import { knownAmountPercent, type NutrientComparisonLimits } from '../../domain/nutrientLimits'
import { aggregateIntake, type MetricCoverage } from '../../domain/nutrition'
import { NUTRIENT_LABELS } from './NutritionFields'
import { DISPLAY_NUTRIENT_FIELDS, nutrientUnit, type DisplayNutrientField } from './nutrientDisplay'

function metricLabel(metric: MetricCoverage, unit: string): string {
  if (metric.knownAmount === null) return '-'
  const amount = Number(metric.knownAmount.toFixed(1)).toLocaleString()
  return `${metric.complete ? '' : 'At least '}${amount} ${unit}`
}

/** Distinct, gentle colors identify nutrients; no color implies a health judgment.
 * These are static Tailwind classes so the bundled offline build retains them.
 */
const NUTRIENT_TILE_COLORS: Record<DisplayNutrientField, string> = {
  proteinG: 'border-violet-200 bg-violet-100 hover:bg-violet-200',
  carbohydratesG: 'border-amber-200 bg-amber-100 hover:bg-amber-200',
  fatG: 'border-orange-200 bg-orange-100 hover:bg-orange-200',
  fiberG: 'border-emerald-200 bg-emerald-100 hover:bg-emerald-200',
  sugarsG: 'border-rose-200 bg-rose-100 hover:bg-rose-200',
  sodiumMg: 'border-sky-200 bg-sky-100 hover:bg-sky-200',
  potassiumMg: 'border-teal-200 bg-teal-100 hover:bg-teal-200'
}

export function NutritionSummary({
  entries, loading = false, reniProfile, reniDayKey, comparisonLimits, detailDayKey, showFluids = true
}: {
  entries?: readonly FoodEntry[]
  loading?: boolean
  /** Only Calendar day details request FNRI comparisons; Today retains logged-only totals. */
  reniProfile?: Profile
  reniDayKey?: string
  comparisonLimits?: NutrientComparisonLimits
  /** Allows the nutrient tiles to link to a selected day's per-entry breakdown. */
  detailDayKey?: string
  /** The dedicated Fluids page owns fluid totals in Calendar. */
  showFluids?: boolean
}) {
  if (loading || entries === undefined) {
    return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading recorded nutrition…</p>
  }
  const summary = aggregateIntake(entries)
  const selectedDay = detailDayKey ?? reniDayKey
  const calendarNutrition = !showFluids
  const primary = [
    { name: 'Calories consumed', metric: summary.nutrients.energyKcal, unit: 'kcal' },
    ...(showFluids ? [{ name: 'Logged fluids', metric: summary.fluids, unit: 'ml' }] : [])
  ]

  return (
    <section aria-label={calendarNutrition ? 'Nutrition summary' : undefined}
      aria-labelledby={showFluids ? 'nutrition-summary-title' : undefined}
      className={calendarNutrition ? 'space-y-6' : 'space-y-3'}>
      {showFluids && <div>
        <h2 id="nutrition-summary-title" className="text-lg font-bold">Recorded nutrition and fluids</h2>
        <p className="mt-1 text-sm text-slate-600">
          {summary.entries ? `${summary.foods} foods · ${summary.beverages} drinks/water entries` : 'Nothing logged on this date'}
        </p>
      </div>}

      {calendarNutrition
        ? <section aria-labelledby="calories-consumed-heading" className="w-full space-y-3">
          <h2 id="calories-consumed-heading" className="text-lg font-semibold">Calories consumed</h2>
          <p className="w-full py-3 text-center text-3xl font-bold tabular-nums text-slate-900">
            {metricLabel(summary.nutrients.energyKcal, 'kcal')}
          </p>
        </section>
        : <div className="grid grid-cols-2 gap-3">
          {primary.map(item => (
            <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-600">{item.name}</h3>
              <p className="mt-3 text-xl font-bold">{metricLabel(item.metric, item.unit)}</p>
            </div>
          ))}
        </div>}

      {summary.nutrients.energyKcal.totalEntryCount > 0 && (
        <section aria-labelledby="nutrients-heading"
          className={calendarNutrition ? 'space-y-3' : 'rounded-2xl border border-slate-200 bg-white p-4'}>
          <h2 id="nutrients-heading" className={calendarNutrition ? 'text-lg font-semibold' : 'font-semibold'}>
            Nutrients
          </h2>
          <div className={calendarNutrition ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3'}>
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
                <span className="text-sm font-semibold text-slate-700">{NUTRIENT_LABELS[field]}</span>
                <span className="mt-3 block break-words text-base font-bold tabular-nums text-slate-900">
                  {metricLabel(metric, nutrientUnit(field))}
                  {percentage !== null && <span>{' '}({metric.complete ? '' : '≥'}{percentage.toFixed(1)}%)</span>}
                </span>
              </>
              const classes = calendarNutrition
                ? 'relative flex min-h-36 min-w-0 flex-col items-center justify-center rounded-2xl border p-3 text-center transition-colors ' + NUTRIENT_TILE_COLORS[field]
                : 'relative block min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-3'
              return selectedDay
                ? <Link key={field} to={`/calendar/${selectedDay}/nutrients/${field}`}
                    className={classes + (calendarNutrition ? '' : ' pr-5 hover:border-evergreen-500 hover:bg-evergreen-50') +
                      ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen-700'}>
                    {content}
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="absolute right-2 top-3 h-4 w-4 text-slate-500">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </Link>
                : <div key={field} className={classes}>{content}</div>
            })}
          </div>
        </section>
      )}
    </section>
  )
}
