import { Link } from 'react-router-dom'
import { PageInfoLink } from '../components/PageInfoLink'

export function AboutPage() {
  return <div className="space-y-5">
    <header>
      <PageInfoLink topic="about" />
      <Link to="/settings" className="text-sm font-semibold text-evergreen-700 underline">Back to Settings</Link>
      <h1 className="mt-4 text-3xl font-bold">About and health information</h1>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm leading-6">
      <h2 className="text-lg font-bold">Health information notice</h2>
      <p>This app provides general, estimated nutrition and activity evaluations for personal tracking.
        Evaluations may be inaccurate or inappropriate for people with pre-existing medical conditions,
        people taking medications that affect metabolism or fluid balance, and people with other
        circumstances that alter nutritional or exercise needs. It is not a medical device and
        does not diagnose, treat, or replace advice from a qualified healthcare professional.</p>
      <p>Adult-oriented energy estimates and weight-goal evaluations do not apply to users under 18.
        Basic logging remains available. No medical-condition histories are collected.</p>
      <p>No personal health history is uploaded or synced. The app keeps records in this browser's
        IndexedDB. Clearing site data can erase them; create a private backup under Settings → Data.</p>
    </section>
  </div>
}
