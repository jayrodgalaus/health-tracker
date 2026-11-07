import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { readGoalForDay, listGoalPeriods } from '../data/profileRepository'
import { ProfileForm } from '../features/profile/ProfileForm'
import { toLocalDay } from '../lib/localDate'
import { PageInfoLink } from '../components/PageInfoLink'
import { useToast } from '../components/ToastProvider'

export function GoalsSettingsPage({ profile }: {profile: Profile}) {
  const goal = useLiveQuery(() => readGoalForDay(toLocalDay(new Date())), [], undefined)
  const history = useLiveQuery(() => listGoalPeriods(), [], undefined)
  const toast = useToast()
  return <div className="space-y-5">
    <header>
      <PageInfoLink topic="goals" />
      <Link to="/settings" className="text-sm font-semibold text-evergreen-700 underline">Back to Settings</Link>
      <h1 className="mt-4 text-3xl font-bold">Goals and targets</h1>
    </header>
    {goal === undefined ? <p role="status">Loading goals…</p> :
      <ProfileForm key={goal?.id + ':' + goal?.createdAt} mode="settings" section="goals" initialProfile={profile} initialGoal={goal} onSaved={() => toast.success('Goals saved.')} />}
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="goal-history-heading">
      <h2 id="goal-history-heading" className="text-lg font-bold">Goal history</h2>
      {history === undefined && <p role="status">Loading goals…</p>}
      {history?.length === 0 && <p>No goals saved yet.</p>}
      <ul className="mt-3 space-y-2">
        {history?.map(item => <li key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
          <strong>{item.effectiveFrom}</strong> · {item.goalType ?? 'Unspecified legacy goal'} · Energy target: {item.targets.energyKcal === null ? 'not set' : item.targets.energyKcal + ' kcal/day'}
        </li>)}
      </ul>
    </section>
  </div>
}
