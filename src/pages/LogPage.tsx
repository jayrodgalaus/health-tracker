import type { Profile } from '../domain/models'
import { WeightLog } from '../features/weight/WeightLog'

export function LogPage({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Daily logging · Phase 1</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Log</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Measure your progress on any past date. All changes are saved locally and can be corrected.</p>
      </header>
      <WeightLog profile={profile} />
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Food, drinks and exercise — next</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Nutrition labels, saved foods, water, drinks, and activity logging are not active in this slice of Phase 1. No calorie totals are invented while these entries are unavailable.</p>
      </section>
    </div>
  )
}
