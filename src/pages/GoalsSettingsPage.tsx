import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { readGoalForDay, listGoalPeriods } from '../data/profileRepository'
import { ProfileForm } from '../features/profile/ProfileForm'
import { toLocalDay } from '../lib/localDate'
import { SettingsPageHeader } from '../components/SettingsPageHeader'
import { useToast } from '../components/ToastProvider'

export function GoalsSettingsPage({ profile }: {profile: Profile}) {
  const goal = useLiveQuery(() => readGoalForDay(toLocalDay(new Date())), [], undefined)
  const history = useLiveQuery(() => listGoalPeriods(), [], undefined)
  const toast = useToast()
  return <div className="space-y-6">
    <SettingsPageHeader title="Goals and targets" topic="goals" icon="goals" />
    {goal === undefined ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading goals…</p> :
      <ProfileForm key={goal?.id + ':' + goal?.createdAt} mode="settings" section="goals" initialProfile={profile} initialGoal={goal} onSaved={() => toast.success('Goals saved.')} />}
    <section className="rounded-3xl border border-slate-200 bg-white px-5 pb-5 pt-5 shadow-sm sm:p-6" aria-labelledby="goal-history-heading">
      <h2 id="goal-history-heading" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
        <span aria-hidden="true" className="rounded-lg bg-evergreen-50 px-2 py-1 text-xs font-extrabold text-evergreen-700">04</span>
        Goal history
      </h2>
      {history === undefined && <p role="status">Loading goals…</p>}
      {history?.length === 0 && <p>No goals saved yet.</p>}
      <ul className="mt-4 space-y-3">
        {history?.map(item => <li key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <strong>{item.effectiveFrom}</strong> · {item.goalType ?? 'Unspecified legacy goal'} · Energy target: {item.targets.energyKcal === null ? 'not set' : item.targets.energyKcal + ' kcal/day'}
        </li>)}
      </ul>
    </section>
  </div>
}
