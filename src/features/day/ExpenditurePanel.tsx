import type { DailySummary } from '../../domain/evaluation'

const shown = (value: number | null) => value == null ? 'Unknown' : '≈ ' + Number(value.toFixed(1)).toLocaleString() + ' kcal'

export function ExpenditurePanel({ summary }: { summary?: DailySummary }) {
  if (!summary) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Calculating recorded energy…</p>
  const value = summary.expenditure
  const calories = summary.intake.nutrients.energyKcal
  const activity = summary.activity
  const partialWorkout = activity.knownEnergyEntries > 0 && activity.unknownEnergyEntries > 0
  return <section aria-labelledby="daily-energy-heading" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 id="daily-energy-heading" className="text-lg font-bold">Recorded intake and estimated energy</h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div><p className="text-xs text-slate-600">Calories consumed</p>
        <p className="mt-2 font-semibold">{calories.knownAmount === null ? 'Unknown' : (calories.complete ? '' : 'At least ') + Number(calories.knownAmount.toFixed(1)) + ' kcal'}</p></div>
      <div><p className="text-xs text-slate-600">Estimated total expended</p>
        <p className="mt-2 font-semibold">{shown(value.totalExpenditureKcal)}</p></div>
      <div><p className="text-xs text-slate-600">Estimated difference (consumed − expended)</p>
        <p className="mt-2 font-semibold">{shown(value.differenceKcal)}</p></div>
    </div>
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <div><dt className="text-xs text-slate-600">Estimated resting kcal/day</dt><dd className="mt-1 font-semibold">{shown(value.restingKcal)}</dd></div>
      <div><dt className="text-xs text-slate-600">Estimated non-workout background</dt><dd className="mt-1 font-semibold">{shown(value.backgroundKcal)}</dd></div>
      <div><dt className="text-xs text-slate-600">Additional logged workout kcal</dt>
        <dd className="mt-1 font-semibold">{partialWorkout ? 'Known portion: ' : ''}{shown(value.workoutIncrementKcal)}</dd></div>
      <div><dt className="text-xs text-slate-600">Selected background multiplier</dt><dd className="mt-1 font-semibold">{value.multiplier === null ? 'Not set' : value.multiplier.toFixed(2)}</dd></div>
    </dl>
  </section>
}
