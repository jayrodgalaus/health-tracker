import { Link } from 'react-router-dom'

interface ComingSoonProps {
  title: string
  phase: '1' | '2' | '3'
  description: string
}

export function ComingSoonPage({ title, phase, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-evergreen-700">Planned · Phase {phase}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-evergreen-50 text-3xl text-evergreen-700" aria-hidden="true">+</div>
        <h2 className="text-xl font-semibold">This section is not active yet</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          The foundation currently includes navigation, offline caching and local data models. This screen does not create or estimate entries.
        </p>
        <Link to="/today" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-evergreen-600 px-5 py-3 text-sm font-semibold text-white hover:bg-evergreen-700">
          Return to Today
        </Link>
      </section>
    </div>
  )
}
