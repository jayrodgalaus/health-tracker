import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import type { Profile } from '../domain/models'
import { ageOnDay } from '../domain/profile'
import { displayNumber, kilogramsTo } from '../domain/units'
import { listWeights } from '../data/weightRepository'
import { toLocalDay } from '../lib/localDate'

const placeholders = [
  { label: 'Calories consumed', unit: 'kcal' },
  { label: 'Estimated calories expended', unit: 'kcal' },
  { label: 'Logged fluids', unit: 'ml' }
] as const

export function TodayPage({ profile }: { profile: Profile }) {
  const dayKey = toLocalDay(new Date())
  const weights = useLiveQuery(() => listWeights(), [], undefined)
  const latestWeight = weights?.[0]
  const todaysWeight = weights?.find(weight => weight.dayKey === dayKey)
  const age = ageOnDay({
    birthDate: profile.birthDate, ageYears: profile.ageYears ?? null, ageAsOf: profile.ageAsOf ?? null
  }, dayKey)

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-evergreen-700">Today · {dayKey}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your day, your pace.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Only your actual records appear here. Nutrition and exercise totals will arrive with the next logging features.</p>
      </div>
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="mb-3 text-lg font-semibold">Daily overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {placeholders.map(item => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-600">{item.label}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums text-slate-400" aria-label="Not available">—</span>
                <span className="text-xs text-slate-500">{item.unit}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Not yet available</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl bg-evergreen-900 p-6 text-white sm:p-8" aria-labelledby="weight-summary-title">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Recorded weight</p>
        <h2 id="weight-summary-title" className="mt-3 text-2xl font-bold">
          {todaysWeight ? `${displayNumber(kilogramsTo(todaysWeight.weightKg, profile.units.mass), 1)} ${profile.units.mass} today` : 'No measurement logged today'}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50">
          {latestWeight ? `Latest recorded: ${displayNumber(kilogramsTo(latestWeight.weightKg, profile.units.mass), 1)} ${profile.units.mass} on ${latestWeight.dayKey}. No measurements are inferred between dates.` : 'Add a measurement whenever you choose. Missing dates are not filled in.'}
        </p>
        <Link to="/log" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-evergreen-900 hover:bg-emerald-50">Add or edit weight</Link>
      </section>
      {age !== null && age < 18 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Basic tracking is available. Adult-oriented calorie-needs and weight-goal evaluations are not available for users under 18.
      </section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">No judgment for incomplete days</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Missing information is different from zero. When Phase 2 evaluation is available, a day will only be scored if you explicitly mark it complete and the relevant entries are assessable.
        </p>
      </section>
    </div>
  )
}
