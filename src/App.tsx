import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { db } from './db/database'
import { readProfile } from './data/profileRepository'
import { TodayPage } from './pages/TodayPage'
import { LogPage } from './pages/LogPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { CalendarPage } from './pages/CalendarPage'
import { DayDetailPage } from './pages/DayDetailPage'
import { SettingsPage } from './pages/SettingsPage'

export type StorageStatus = 'opening' | 'ready' | 'unavailable'

export default function App() {
  const [storage, setStorage] = useState<StorageStatus>('opening')
  const profile = useLiveQuery(() => readProfile(), [], undefined)

  useEffect(() => {
    let active = true
    db.open().then(
      () => { if (active) setStorage('ready') },
      () => { if (active) setStorage('unavailable') }
    )
    return () => { active = false }
  }, [])

  if (storage === 'opening' || (storage === 'ready' && profile === undefined)) {
    return <AppShell hideNavigation><p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600">Opening your local tracker…</p></AppShell>
  }
  if (storage === 'unavailable') {
    return <AppShell hideNavigation><div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-900">
      Local IndexedDB could not be opened. Check browser storage permissions or free device space, then reload. No changes can be saved until this is resolved.
    </div></AppShell>
  }
  if (!profile) {
    return <AppShell hideNavigation><Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes></AppShell>
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/onboarding" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage profile={profile} />} />
        <Route path="/log" element={<LogPage profile={profile} />} />
        <Route path="/calendar" element={<CalendarPage profile={profile} />} />
        <Route path="/calendar/:dayKey" element={<DayDetailPage profile={profile} />} />
        <Route path="/trends" element={<ComingSoonPage title="Trends" phase="3" description="History, accessible charts and filters will appear here once real entries exist." />} />
        <Route path="/settings" element={<SettingsPage storage={storage} profile={profile} />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AppShell>
  )
}
