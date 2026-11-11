import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { readGoalForDay } from '../data/profileRepository'
import { ProfileForm } from '../features/profile/ProfileForm'
import { toLocalDay } from '../lib/localDate'
import { PageInfoLink } from '../components/PageInfoLink'
import { useToast } from '../components/ToastProvider'

export function ProfileSettingsPage({ profile }: {profile: Profile}) {
  const current = useLiveQuery(() => readGoalForDay(toLocalDay(new Date())), [], undefined)
  const toast = useToast()
  return <div className="space-y-6">
    <header className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/settings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evergreen-700 underline underline-offset-4">
          <span aria-hidden="true">‹</span> Back to Settings
        </Link>
        <PageInfoLink topic="profile" />
      </div>
      <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-evergreen-900 via-evergreen-700 to-evergreen-600 p-5 text-white shadow-sm sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full border-[24px] border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="17" r="8" />
              <path d="M9 40c1.5-8 7.5-12 15-12s13.5 4 15 12" />
            </svg>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Profile</h1>
        </div>
      </div>
    </header>
    {current === undefined ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading profile…</p> :
      <ProfileForm key={profile.updatedAt} mode="settings" section="profile" initialProfile={profile} initialGoal={current} onSaved={() => toast.success('Profile saved.')} />}
  </div>
}
