import { Link } from 'react-router-dom'
import { toLocalDay } from '../lib/localDate'

const placeholders = [
  { label: 'Energy consumed', unit: 'kcal' },
  { label: 'Energy expended', unit: 'kcal' },
  { label: 'Water & fluids', unit: 'ml' }
] as const

export function TodayPage() {
  const today = new Date()
  const dayKey = toLocalDay(today)
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-evergreen-700">Today · {dayKey}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">A clearer view of your day.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          This is your personal dashboard. Summaries will reflect your own entries, never invented measurements.
        </p>
      </div>

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="mb-3 text-lg font-semibold">Daily overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {placeholders.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-600">{item.label}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums text-slate-400" aria-label="Not recorded">—</span>
                <span className="text-xs text-slate-500">{item.unit}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Not recorded</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-evergreen-900 p-6 text-white sm:p-8" aria-labelledby="getting-started-heading">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Phase 0 foundation</p>
        <h2 id="getting-started-heading" className="mt-3 text-2xl font-bold">Ready for your own records</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50">
          The private on-device database and navigation are being prepared first. Daily entry controls arrive in Phase 1.
        </p>
        <Link to="/log" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-evergreen-900 hover:bg-emerald-50">
          View logging roadmap
        </Link>
      </section>

      <section aria-label="Data accuracy notice" className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">No judgments for unlogged days</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Missing information is different from zero. A day is assessed only after it has been marked complete and has enough information.
        </p>
      </section>
    </div>
  )
}
