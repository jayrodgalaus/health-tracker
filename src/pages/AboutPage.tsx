import { SettingsPageHeader } from '../components/SettingsPageHeader'

export function AboutPage() {
  return <div className="space-y-6">
    <SettingsPageHeader title="About and health notice" topic="about" icon="about" />
    <section aria-labelledby="health-notice-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="health-notice-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
        <span aria-hidden="true" className="rounded-lg bg-evergreen-50 px-2 py-1 text-xs font-extrabold text-evergreen-700">01</span>
        Health information notice
      </h2>
      <p className="text-sm leading-7 text-slate-700">This app provides general, estimated nutrition and activity evaluations for personal tracking.
        Evaluations may be inaccurate or inappropriate for people with pre-existing medical conditions,
        people taking medications that affect metabolism or fluid balance, and people with other
        circumstances that alter nutritional or exercise needs. It is not a medical device and
        does not diagnose, treat, or replace advice from a qualified healthcare professional.</p>
    </section>
    <section aria-labelledby="adult-limits-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="adult-limits-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
        <span aria-hidden="true" className="rounded-lg bg-evergreen-50 px-2 py-1 text-xs font-extrabold text-evergreen-700">02</span>
        Adult-only evaluations
      </h2>
      <p className="text-sm leading-7 text-slate-700">Adult-oriented energy estimates and weight-goal evaluations do not apply to users under 18.
        Basic logging remains available. No medical-condition histories are collected.</p>
    </section>
    <section aria-labelledby="local-privacy-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="local-privacy-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
        <span aria-hidden="true" className="rounded-lg bg-evergreen-50 px-2 py-1 text-xs font-extrabold text-evergreen-700">03</span>
        Privacy and local storage
      </h2>
      <p className="text-sm leading-7 text-slate-700">No personal health history is uploaded or synced. The app keeps records in this browser's
        IndexedDB. Clearing site data can erase them; create a private backup under Settings → Data.</p>
    </section>
  </div>
}
