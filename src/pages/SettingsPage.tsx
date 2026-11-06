import type { StorageStatus } from '../App'

export function SettingsPage({ storage }: { storage: StorageStatus }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Personal preferences</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Your profile, goals, units, and backup tools will be added in later phases.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="storage-heading">
        <h2 id="storage-heading" className="text-lg font-semibold">On-device storage</h2>
        <p className="mt-2 text-sm text-slate-600" role="status">
          {storage === 'ready' ? 'IndexedDB is available on this device.' :
            storage === 'opening' ? 'Checking local storage availability…' :
              'IndexedDB is unavailable. Data cannot be saved.'}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This app has no account, server, analytics, or cloud sync. Data is stored only in this browser.
          Clearing browser storage can erase records; JSON backup and restore are planned for Phase 3.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="safety-heading">
        <h2 id="safety-heading" className="text-lg font-semibold">Important wellness notice</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Health Tracker is intended for adults aged 18 and over. It is a personal wellness tool,
          not a clinical device or a source of diagnosis or treatment. Calorie and exercise estimates
          can be inaccurate, and evaluations may be inaccurate for users with pre-existing medical conditions.
          Consult a qualified professional for individualized health advice.
        </p>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5" aria-labelledby="future-settings-heading">
        <h2 id="future-settings-heading" className="font-semibold">Upcoming settings</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Phase 1: profile and unit preferences. Phase 2: explainable goal evaluation.
          Phase 3: JSON export/import backup, migrations and polish.
        </p>
      </section>
    </div>
  )
}
