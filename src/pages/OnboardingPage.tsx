import { ProfileForm } from '../features/profile/ProfileForm'

export function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Welcome · Set up your profile</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Track what matters to you.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your records stay in this browser's IndexedDB. There is no account, server, or cloud sync.
          Browser storage can be cleared, so please keep in mind that JSON backup and restore will arrive before v1.
        </p>
      </div>
      <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Health information notice.</strong> This app provides general, estimated nutrition and activity evaluations for personal tracking.
        Evaluations may be inaccurate or inappropriate for people with pre-existing medical conditions,
        people taking medications that affect metabolism or fluid balance, and people with other circumstances
        that alter nutritional or exercise needs. It is not a medical device and does not diagnose, treat,
        or replace advice from a qualified healthcare professional.
        <p className="mt-2">Adult-oriented estimates and weight-goal evaluations will not be shown for people under 18. Basic logging remains available.</p>
      </div>
      <ProfileForm mode="onboarding" />
    </div>
  )
}
