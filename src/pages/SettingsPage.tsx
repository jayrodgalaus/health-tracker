import { useLiveQuery } from 'dexie-react-hooks'
import type { Profile } from '../domain/models'
import { readGoalForDay } from '../data/profileRepository'
import { ProfileForm } from '../features/profile/ProfileForm'
import { toLocalDay } from '../lib/localDate'
import type { StorageStatus } from '../App'

export function SettingsPage({ storage, profile }: { storage: StorageStatus; profile: Profile }) {
  const activeGoal = useLiveQuery(() => readGoalForDay(toLocalDay(new Date())), [], undefined)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Personal preferences</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Edit your profile, units and dated goals without deleting previous measurements.</p>
      </div>
      {activeGoal === undefined ? (
        <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600">Loading your saved settings…</p>
      ) : (
        <ProfileForm key={`${profile.updatedAt}:${activeGoal?.id ?? 'none'}`} mode="settings" initialProfile={profile} initialGoal={activeGoal} />
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="storage-heading">
        <h2 id="storage-heading" className="text-lg font-semibold">On-device storage</h2>
        <p className="mt-2 text-sm text-slate-600" role="status">
          {storage === 'ready' ? 'IndexedDB is available on this device.' : storage === 'opening' ? 'Checking local storage…' : 'IndexedDB is unavailable.'}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          No account, remote server, analytics or cloud sync is used. Clearing browser data can erase records.
          Export and import of complete JSON backups will be added in Phase 3, before v1 is complete.
        </p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="safety-heading">
        <h2 id="safety-heading" className="text-lg font-semibold">About · Health information notice</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This app provides general, estimated nutrition and activity evaluations for personal tracking.
          Evaluations may be inaccurate or inappropriate for people with pre-existing medical conditions,
          people taking medications that affect metabolism or fluid balance, and people with other
          circumstances that alter nutritional or exercise needs. It is not a medical device and
          does not diagnose, treat, or replace advice from a qualified healthcare professional.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Adult-oriented energy estimates and weight-goal evaluations do not apply to users under 18.
          Basic logging remains available. No medical-condition histories are collected.
        </p>
      </section>
    </div>
  )
}
