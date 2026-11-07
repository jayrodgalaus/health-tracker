import type { ExerciseEntry, Profile, WeightEntry } from '../../domain/models'
import { calculateActivityDay, calculateActivityWeek, type ActivityDaySummary, type ActivityWeekSummary } from '../../domain/activity'
import { ageOnDay } from '../../domain/profile'

interface Props {
  dayKey: string
  profile: Profile
  dayActivities?: ExerciseEntry[]
  weekActivities?: ExerciseEntry[]
  weights?: WeightEntry[]
  frozenDay?: ActivityDaySummary
  frozenWeek?: ActivityWeekSummary
}

export function ActivitySummary({ dayKey, profile, dayActivities, weekActivities, weights, frozenDay, frozenWeek }: Props) {
  if (!dayActivities || !weekActivities || !weights) {
    return <p role="status" className="rounded-2xl bg-white p-4 text-sm text-slate-600">Loading recorded exercise…</p>
  }
  const age = ageOnDay({
    birthDate: profile.birthDate, ageYears: profile.ageYears ?? null, ageAsOf: profile.ageAsOf ?? null
  }, dayKey)
  const adult = age !== null && age >= 18
  const day = frozenDay ?? calculateActivityDay(dayKey, dayActivities, weights, adult)
  const week = frozenWeek ?? calculateActivityWeek(dayKey, weekActivities)
  const known = day.knownIncrementalKcal

  return (
    <section className="space-y-3" aria-labelledby="activity-summary-title">
      <div>
        <h2 id="activity-summary-title" className="text-lg font-bold">Logged activity</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-600">Workout minutes</h3>
          <p className="mt-3 text-xl font-bold">{day.loggedMinutes === null ? 'Not recorded' : `${day.missingDurationEntries ? 'At least ' : ''}${Number(day.loggedMinutes.toFixed(1))} min`}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-600">Estimated additional workout kcal</h3>
          <p className="mt-3 text-xl font-bold">{!adult ? 'Not evaluated' : known === null ? 'Unknown' : `${Number(known.toFixed(1))} kcal`}</p>
          <p className="mt-2 text-xs text-slate-500">
            {!adult ? 'Adult-oriented exercise energy estimates are unavailable for users under 18 or without confirmed adult age.'
              : day.entries === 0 ? 'No sessions recorded; not assumed to be zero.'
                : day.energyCoverageComplete ? `Known method for all ${day.entries} sessions.`
                  : `Partial estimate: ${day.knownEnergyEntries} of ${day.entries} sessions have an estimate; ${day.unknownEnergyEntries} unknown.`}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">This week's logged sessions</h3>
        {week.loggedMinutes === null ? (
          <p className="mt-3 text-sm text-slate-600">{week.entries > 0 ? `${week.entries} session(s) recorded without duration; minutes remain unknown.` : 'No exercise logged this week. This is not a judgment about your activity.'}</p>
        ) : (
          <>{week.missingDurationEntries > 0 && <p className="mt-2 text-xs text-slate-600">{week.missingDurationEntries} distance-only session(s) have no recorded minutes.</p>}
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-600">Known minutes</dt><dd className="mt-1 font-semibold">{week.missingDurationEntries ? 'At least ' : ''}{week.loggedMinutes} min</dd></div>
            <div><dt className="text-xs text-slate-600">Sessions</dt><dd className="mt-1 font-semibold">{week.entries}</dd></div>
            <div><dt className="text-xs text-slate-600">Strength days recorded</dt><dd className="mt-1 font-semibold">{week.loggedStrengthDays} days</dd></div>
          </dl></>
        )}
      </div>
    </section>
  )
}
