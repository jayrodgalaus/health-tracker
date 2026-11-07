import type { FoodEntry, Profile } from '../../domain/models'
import { reniPercent, reniReferenceForDay } from '../../domain/reni'
import { aggregateIntake, type MetricCoverage, type NutrientField } from '../../domain/nutrition'
import { NUTRIENT_LABELS } from './NutritionFields'

const viewFields: NutrientField[] = ['proteinG', 'carbohydratesG', 'fatG', 'fiberG', 'sugarsG', 'sodiumMg', 'potassiumMg']

function metricLabel(metric: MetricCoverage, unit: string): string {
  if (metric.knownAmount === null) return 'Not known'
  const amount = Number(metric.knownAmount.toFixed(1)).toLocaleString()
  return `${metric.complete ? '' : 'At least '}${amount} ${unit}`
}

function coverageDescription(metric: MetricCoverage): string {
  if (!metric.totalEntryCount) return 'No entries'
  if (metric.unknownEntryCount) return `Known for ${metric.knownEntryCount} of ${metric.totalEntryCount} entries; ${metric.unknownEntryCount} missing`
  return `Known for all ${metric.totalEntryCount} entries`
}

export function NutritionSummary({
  entries, loading = false, reniProfile, reniDayKey
}: {
  entries?: readonly FoodEntry[]
  loading?: boolean
  /** Only Calendar day details request FNRI comparison; Today retains logged-only totals. */
  reniProfile?: Profile
  reniDayKey?: string
}) {
  if (loading || entries === undefined) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading recorded nutrition…</p>
  const summary = aggregateIntake(entries)
  const primary = [
    { name: 'Calories consumed', metric: summary.nutrients.energyKcal, unit: 'kcal' },
    { name: 'Logged fluids', metric: summary.fluids, unit: 'ml' }
  ]
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
            <p className="mt-2 text-xs leading-5 text-slate-500">{coverageDescription(item.metric)}</p>
          </div>
        ))}
      </div>
      {summary.entries > 0 && <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">Nutrients</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {viewFields.map(field => {
            const metric = summary.nutrients[field]
            const reference = reniProfile && reniDayKey
              ? reniReferenceForDay(field, reniProfile, reniDayKey) : null
            const percentage = reniPercent(metric, reference)
            return <div key={field}>
              <dt className="text-xs font-semibold text-slate-600">{NUTRIENT_LABELS[field]}</dt>
              <dd className="mt-1 text-sm font-semibold">
                {metricLabel(metric, field.endsWith('Mg') ? 'mg' : 'g')}
                {reference && (percentage !== null
                  ? <span title={reference.description + ' · FNRI PDRI 2015' + (metric.complete ? '' : ' · Minimum based on known entries')}>
                      {' '}({metric.complete ? '' : '≥'}{percentage.toFixed(1)}%)
                    </span>
                  : <span className="text-xs font-normal text-slate-500"> (unknown %)</span>)}
                {reniProfile && reniDayKey && !reference &&
                  <span className="text-xs font-normal text-slate-500"> (no reference %)</span>}
              </dd>
              <dd className="mt-1 text-xs text-slate-500">{coverageDescription(metric)}</dd>
            </div>
          })}
        </dl>
        {reniProfile && reniDayKey && <p className="mt-3 text-xs leading-5 text-slate-500">
          Percentages compare known logged amounts with applicable adult FNRI PDRI daily references, regardless of day completion.
          ≥ means at least that percentage because some entries lack nutrient data; the true total may be higher.
          Unknown or unavailable references are not treated as zero.
        </p>}
      </div>}
    </section>
  )
}
