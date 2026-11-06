import type { Profile } from '../domain/models'
import { IntakeLog } from '../features/nutrition/IntakeLog'
import { WeightLog } from '../features/weight/WeightLog'

export function LogPage({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Daily logging · Phase 1</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Log</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Log food, drinks, plain water and measured weight for today or a past date. Edit or delete entries whenever needed. Everything stays in your browser.</p>
      </header>
      <IntakeLog />
      <WeightLog profile={profile} />
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Exercise logging — next Phase 1 slice</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Exercise duration, intensity and optional calorie estimates are not available yet. We do not infer exercise or calorie expenditure from an unlogged day.</p>
      </section>
    </div>
  )
}
