import type { DailySummary } from '../../domain/evaluation'
import type { HealthGoal } from '../../domain/models'
import { energyGaugeResult } from '../../domain/energyGauge'

function number(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}
function kcal(value: number | null): string {
  return value === null ? 'Unknown' : '≈ ' + number(value) + ' kcal'
}
function signedDifference(value: number | null): string {
  if (value === null) return 'Unknown'
  const rounded = Math.round(Math.abs(value))
  return (rounded === 0 ? '≈ 0' : (value < 0 ? '≈ −' : '≈ +') + number(rounded)) + ' kcal'
}

/** Arc is descriptive. Its color is neutral until the day's energy can be assessed. */
export function ExpenditurePanel({
  summary, goal
}: {
  summary?: DailySummary
  goal?: HealthGoal | null
}) {
  if (!summary) return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Calculating recorded energy…</p>
  const value = summary.expenditure
  const calories = summary.intake.nutrients.energyKcal
  const activity = summary.activity
  const partialWorkout = activity.knownEnergyEntries > 0 && activity.unknownEnergyEntries > 0
  const gauge = energyGaugeResult(
    calories.knownAmount, value.totalExpenditureKcal, value.differenceKcal,
    goal, summary.evaluation.isComplete, calories.complete
  )
  const arcColor = gauge.state === 'aligned' ? '#0d9488'
    : gauge.state === 'outside' ? '#d97706' : '#94a3b8'
  const eaten = calories.knownAmount === null ? 'Unknown'
    : (calories.complete ? '' : '≥ ') + number(calories.knownAmount)
  const expended = value.totalExpenditureKcal === null ? 'Unknown' : number(value.totalExpenditureKcal)
  return <section aria-labelledby="daily-energy-heading" className="space-y-4">
    <h2 id="daily-energy-heading" className="text-lg font-bold">Recorded intake and estimated energy</h2>
    <div className="rounded-2xl border border-slate-200 bg-white px-3 pb-3 pt-4 shadow-sm sm:px-5">
      <div role="group" aria-label="Daily energy difference" data-goal-state={gauge.state}
        className="relative mx-auto w-full max-w-[420px]">
        <svg viewBox="0 0 320 210" className="block h-auto w-full" aria-hidden="true">
          <path d="M 74 190 A 105 105 0 1 1 246 190" fill="none"
            stroke="#e5e7eb" strokeWidth="11" strokeLinecap="round" />
          <path d="M 74 190 A 105 105 0 1 1 246 190" fill="none"
            stroke={arcColor} strokeWidth="11" strokeLinecap="round"
            pathLength={100} strokeDasharray={gauge.fill * 100 + ' 100'} />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid grid-cols-[22%_56%_22%] items-center">
          <div className="translate-y-3 text-center">
            <p className="text-base font-bold tabular-nums tracking-tight text-slate-800 sm:text-lg">{eaten}</p>
            <p className="mt-1 text-xs text-slate-500">Eaten</p>
          </div>
          <div className="-translate-y-2 text-center">
            <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">
              {signedDifference(value.differenceKcal)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Difference</p>
          </div>
          <div className="translate-y-3 text-center">
            <p className="text-base font-bold tabular-nums tracking-tight text-slate-800 sm:text-lg">{expended}</p>
            <p className="mt-1 text-xs text-slate-500">Expended</p>
          </div>
        </div>
      </div>
    </div>
    <dl className="grid grid-cols-2 gap-3">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="text-xs font-semibold leading-5 text-slate-600">Estimated resting kcal/day</dt>
        <dd className="mt-3 break-words text-lg font-bold tabular-nums text-slate-900">{kcal(value.restingKcal)}</dd>
      </div>
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="text-xs font-semibold leading-5 text-slate-600">Estimated non-workout background</dt>
        <dd className="mt-3 break-words text-lg font-bold tabular-nums text-slate-900">{kcal(value.backgroundKcal)}</dd>
      </div>
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="text-xs font-semibold leading-5 text-slate-600">Additional logged workout kcal</dt>
        <dd className="mt-3 break-words text-lg font-bold tabular-nums text-slate-900">
          {partialWorkout ? 'Known ≥ ' : ''}{kcal(value.workoutIncrementKcal)}
        </dd>
      </div>
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <dt className="text-xs font-semibold leading-5 text-slate-600">Lifestyle activity multiplier</dt>
        <dd className="mt-3 text-lg font-bold tabular-nums text-slate-900">
          {value.multiplier === null ? 'Not set' : value.multiplier.toFixed(2) + '×'}
        </dd>
      </div>
    </dl>
  </section>
}
