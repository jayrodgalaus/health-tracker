import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { readGoalForDay } from '../data/profileRepository'
import { ProfileForm } from '../features/profile/ProfileForm'
import { toLocalDay } from '../lib/localDate'
import { PageInfoLink } from '../components/PageInfoLink'

export function ProfileSettingsPage({ profile }: {profile: Profile}) {
  const current = useLiveQuery(() => readGoalForDay(toLocalDay(new Date())), [], undefined)
  const [saved, setSaved] = useState(false)
  return <div className="space-y-5">
    <header>
      <PageInfoLink topic="profile" />
      <Link to="/settings" className="text-sm font-semibold text-evergreen-700 underline">Back to Settings</Link>
      <h1 className="mt-4 text-3xl font-bold">Profile</h1>
    </header>
    {current === undefined ? <p role="status">Loading profile…</p> :
      <ProfileForm key={profile.updatedAt} mode="settings" section="profile" initialProfile={profile} initialGoal={current} onSaved={() => setSaved(true)} />}
    {saved && <p role="status" className="rounded-xl bg-evergreen-50 p-3 text-sm text-evergreen-900">Profile changes saved locally.</p>}
  </div>
}
