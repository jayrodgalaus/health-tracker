import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { readDayLocked } from '../data/dayRepository'
import type { Profile } from '../domain/models'
import { WeightQuickCard } from '../features/weight/WeightQuickCard'
import { selectedLogDay } from '../lib/logDate'

export function WeightEntryPage({ profile }: { profile: Profile }) {
  const [params] = useSearchParams()
  const dayKey = selectedLogDay(params.get('date'))
  const locked = useLiveQuery(() => readDayLocked(dayKey), [dayKey], undefined)
  const back = '/log?date=' + encodeURIComponent(dayKey)

  if (locked === undefined) return <p role="status" className="rounded-xl bg-white p-4">Checking day status…</p>
  if (locked) return <section aria-label="Locked day" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
    <h1 className="text-xl font-bold">Completed day · Read only</h1>
    <p className="text-sm text-slate-600">Reopen this date from its Calendar details before changing or deleting weight.</p>
    <Link className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 underline"
      to={'/calendar/' + dayKey}>View locked day</Link>
  </section>

  return <div className="space-y-6">
    <header>
      
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline"
        to={back}>‹ Back to Log</Link>
      <PageTitle topic="weight" className="mt-3" titleClassName="text-3xl font-bold">Log weight</PageTitle>
    </header>
    <WeightQuickCard key={dayKey} dayKey={dayKey} unit={profile.units.mass} />
  </div>
}
