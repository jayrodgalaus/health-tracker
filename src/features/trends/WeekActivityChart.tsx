import type { WeekTrend } from '../../domain/trends'

export function WeekActivityChart({ weeks }: { weeks: readonly WeekTrend[] }) {
  const maxMinutes = Math.max(1, ...weeks.map(week => week.loggedMinutes ?? 0))
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
    aria-labelledby="activity-week-heading">
    <h3 id="activity-week-heading" className="font-bold">Weekly recorded activity</h3>
    {weeks.length === 0 && <p className="text-sm text-slate-600">No weeks selected.</p>}
    <ul className="space-y-4">
      {weeks.map(week => <li key={week.start} className="space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-700">
          <strong>{week.start} – {week.end}</strong>
          <span>{week.loggedMinutes === null
            ? (week.missingDurationEntries ? 'Minutes not recorded' : 'No activity logged')
            : (week.missingDurationEntries ? 'At least ' : '') + week.loggedMinutes + ' min logged'}
            {' · '}{week.strengthDays === null ? 'Strength days unknown' : week.strengthDays + ' strength days'}
          </span>
        </div>
        {week.loggedMinutes !== null
          ? <div className="h-4 overflow-hidden rounded-full bg-slate-100" role="img"
              aria-label={(week.missingDurationEntries ? 'At least ' : '') + week.loggedMinutes + ' known exercise minutes' +
                (week.missingDurationEntries ? '; ' + week.missingDurationEntries + ' sessions without recorded minutes' : '')}>
              <div className="h-full rounded-full bg-emerald-600"
                style={{ width: week.loggedMinutes / maxMinutes * 100 + '%' }} />
            </div>
          : <div className="h-3 rounded-full border border-dashed border-slate-300" aria-label="No recorded exercise minutes" />}
        {week.missingDurationEntries > 0 && <p className="text-xs text-slate-600">
          {week.missingDurationEntries} distance-only session(s) have no recorded minutes.
        </p>}
      </li>)}
    </ul>
  </section>
}
