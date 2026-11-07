import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import type { Profile } from '../domain/models'
import { db } from '../db/database'
import { setDayComplete } from '../data/dayRepository'
import { PageInfoLink } from '../components/PageInfoLink'
import { WeightQuickCard } from '../features/weight/WeightQuickCard'
import { selectedLogDay } from '../lib/logDate'
import { toLocalDay } from '../lib/localDate'

const actionClass = 'flex min-h-14 items-center justify-center rounded-xl bg-evergreen-600 px-4 py-3 text-base font-semibold text-white hover:bg-evergreen-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evergreen-700'

export function LogPage({ profile }: { profile: Profile }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const dayKey = selectedLogDay(searchParams.get('date'))
  const today = toLocalDay(new Date())
  const legacyAction = searchParams.get('add')
  // A missing review is a loaded, not-yet-completed day (null), not a pending query (undefined).
  const review = useLiveQuery(async () => (await db.dayReviews.get(dayKey)) ?? null, [dayKey], undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const actionDate = '?date=' + encodeURIComponent(dayKey)
  const saved = searchParams.get('saved')
  const savedVolume = searchParams.get('volume')

  // Older Today / Calendar bookmarks used ?add=... in the combined Log page.
  if (legacyAction && ['food', 'drink', 'exercise', 'water'].includes(legacyAction)) {
    const route = legacyAction === 'exercise' ? 'exercise' : legacyAction === 'food' ? 'food' : 'drink'
    return <Navigate to={'/log/' + route + actionDate + (legacyAction === 'water' ? '&water=1' : '')} replace />
  }

  function selectDay(value: string) {
    const next = selectedLogDay(value)
    if (next !== value) return
    setError('')
    setNotice('')
    setSearchParams({date: next})
  }

  async function toggleComplete() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const nextComplete = !review?.isComplete
      await setDayComplete(dayKey, nextComplete)
      setNotice(nextComplete ? 'Day marked complete.' : 'Day reopened.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update day completion.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-6">
    <header>
      <PageInfoLink topic="log" />
      <h1 className="text-3xl font-bold tracking-tight">Log</h1>
      <label className="mt-4 block max-w-xs text-sm font-semibold">Date
        <input type="date" min="1900-01-01" max={today} value={dayKey}
          className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
          onChange={event => selectDay(event.target.value)} />
      </label>
    </header>

    {saved === 'food' && <p role="status" className="rounded-xl bg-evergreen-50 p-3 text-sm text-evergreen-900">Intake entry saved on this device.</p>}
    {saved === 'exercise' && <p role="status" className="rounded-xl bg-evergreen-50 p-3 text-sm text-evergreen-900">Exercise saved locally.</p>}
    {saved === 'water' && <p role="status" className="rounded-xl bg-evergreen-50 p-3 text-sm text-evergreen-900">Logged {savedVolume ?? ''} ml of water.</p>}

    <section aria-label="Quick actions" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">Quick actions</h2>
      <nav aria-label="Quick actions" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link className={actionClass} to={'/log/food' + actionDate}>+ Food</Link>
        <Link className={actionClass} to={'/log/drink' + actionDate}>+ Drink</Link>
        <Link className={actionClass} to={'/log/exercise' + actionDate}>+ Exercise</Link>
      </nav>
    </section>

    <section id="weight" aria-label="Log weight" className="scroll-mt-6">
      <WeightQuickCard key={dayKey} dayKey={dayKey} unit={profile.units.mass} />
    </section>

    {notice && <p role="status" className="rounded-xl bg-evergreen-50 p-3 text-sm text-evergreen-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
    <button type="button" onClick={() => {void toggleComplete()}} disabled={review === undefined || busy}
      aria-pressed={review?.isComplete === true}
      className="min-h-14 w-full rounded-xl bg-evergreen-600 px-5 py-3 text-base font-bold text-white hover:bg-evergreen-700 disabled:opacity-50">
      {busy ? 'Saving…' : review?.isComplete ? 'Reopen day' : 'Mark day complete'}
    </button>
  </div>
}
