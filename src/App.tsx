import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { db } from './db/database'
import { TodayPage } from './pages/TodayPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { SettingsPage } from './pages/SettingsPage'

export type StorageStatus = 'opening' | 'ready' | 'unavailable'

export default function App() {
  const [storage, setStorage] = useState<StorageStatus>('opening')

  useEffect(() => {
    let active = true
    db.open().then(
      () => { if (active) setStorage('ready') },
      () => { if (active) setStorage('unavailable') }
    )
    return () => { active = false }
  }, [])

  return (
    <AppShell>
      {storage === 'unavailable' && (
        <div role="alert" className="mb-5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          Local storage could not be opened. Check whether IndexedDB is blocked or storage is full.
          Logging must not be used until storage is available.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/log" element={<ComingSoonPage title="Daily log" phase="1" description="Food, drinks, exercise and weight entry will be available here in Phase 1. No sample data has been added." />} />
        <Route path="/calendar" element={<ComingSoonPage title="Calendar" phase="2" description="After logging is ready, a date-by-date view and explainable day status will appear here." />} />
        <Route path="/trends" element={<ComingSoonPage title="Trends" phase="3" description="History, accessible charts and filters will appear here once real entries exist." />} />
        <Route path="/settings" element={<SettingsPage storage={storage} />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AppShell>
  )
}
