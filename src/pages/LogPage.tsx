import type { Profile } from '../domain/models'
import { IntakeLog } from '../features/nutrition/IntakeLog'
import { ExerciseLog } from '../features/exercise/ExerciseLog'
import { WeightLog } from '../features/weight/WeightLog'

export function LogPage({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Daily logging · Phase 1</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Log</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Log food, drinks, plain water, exercise and measured weight for today or a selected past date. Entries and evaluations refresh from local records. Edit or delete entries whenever needed. Everything stays in your browser.</p>
      </header>
      <IntakeLog />
      <ExerciseLog profile={profile} />
      <section id="weight" className="scroll-mt-6">
        <WeightLog profile={profile} />
      </section>
    </div>
  )
}
