import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { readGoalForDay } from '../data/profileRepository'
import { ProfileForm } from '../features/profile/ProfileForm'
import { toLocalDay } from '../lib/localDate'
import { SettingsPageHeader } from '../components/SettingsPageHeader'
import { useToast } from '../components/ToastProvider'

export function ProfileSettingsPage({ profile }: {profile: Profile}) {
  const current = useLiveQuery(() => readGoalForDay(toLocalDay(new Date())), [], undefined)
  const toast = useToast()
  return <div className="space-y-6">
    <SettingsPageHeader title="Profile" topic="profile" icon="profile" />
    {current === undefined ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading profile…</p> :
      <ProfileForm key={profile.updatedAt} mode="settings" section="profile" initialProfile={profile} initialGoal={current} onSaved={() => toast.success('Profile saved.')} />}
  </div>
}
