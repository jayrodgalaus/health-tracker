import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LoadingSplash } from './components/LoadingSplash'
import { ToastProvider } from './components/ToastProvider'
import { db } from './db/database'
import { readProfile } from './data/profileRepository'
import { TodayPage } from './pages/TodayPage'
import { LogPage } from './pages/LogPage'
import { WeightEntryPage } from './pages/WeightEntryPage'
import { IntakeEntryPage } from './pages/IntakeEntryPage'
import { ExerciseEntryPage } from './pages/ExerciseEntryPage'
import { SavedFoodsPage } from './pages/SavedFoodsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { TrendsPage } from './pages/TrendsPage'
import { DataPage } from './pages/DataPage'
import { CalendarPage } from './pages/CalendarPage'
import { DayDetailPage } from './pages/DayDetailPage'
import { CalendarSectionPage } from './pages/CalendarSectionPage'
import { NutrientDetailPage } from './pages/NutrientDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfileSettingsPage } from './pages/ProfileSettingsPage'
import { GoalsSettingsPage } from './pages/GoalsSettingsPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { AboutPage } from './pages/AboutPage'
import { DocsPage } from './pages/DocsPage'
import { DocsTopicPage } from './pages/DocsTopicPage'

export type StorageStatus = 'opening' | 'ready' | 'unavailable'

export default function App() {
  return <ToastProvider><TrackerApp /></ToastProvider>
}

function TrackerApp() {
  const [storage, setStorage] = useState<StorageStatus>('opening')
  const [splashSettled, setSplashSettled] = useState(false)
  const profile = useLiveQuery(() => readProfile(), [], undefined)

  useEffect(() => {
    let active = true
    db.open().then(
      () => { if (active) setStorage('ready') },
      () => { if (active) setStorage('unavailable') }
    )
    return () => { active = false }
  }, [])

  if (storage === 'unavailable') {
    return <AppShell hideNavigation><div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-900">
      Local IndexedDB could not be opened. Check browser storage permissions or free device space, then reload. No changes can be saved until this is resolved.
    </div></AppShell>
  }
  if (!splashSettled || storage === 'opening' || profile === undefined) {
    return <LoadingSplash onSettled={() => setSplashSettled(true)} />
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
        <Route path="/log" element={<LogPage />} />
        <Route path="/log/weight" element={<WeightEntryPage profile={profile} />} />
        <Route path="/log/food" element={<IntakeEntryPage kind="food" />} />
        <Route path="/log/drink" element={<IntakeEntryPage kind="beverage" />} />
        <Route path="/log/exercise" element={<ExerciseEntryPage profile={profile} />} />
        <Route path="/log/saved-foods" element={<SavedFoodsPage />} />
        <Route path="/calendar" element={<CalendarPage profile={profile} />} />
        <Route path="/calendar/:dayKey/nutrients/:field" element={<NutrientDetailPage />} />
        <Route path="/calendar/:dayKey/:section" element={<CalendarSectionPage profile={profile} />} />
        <Route path="/calendar/:dayKey" element={<DayDetailPage profile={profile} />} />
        <Route path="/trends" element={<TrendsPage profile={profile} />} />
        <Route path="/settings" element={<SettingsPage storage={storage} />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage profile={profile} />} />
        <Route path="/settings/goals" element={<GoalsSettingsPage profile={profile} />} />
        <Route path="/settings/preferences" element={<PreferencesPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="/settings/docs" element={<DocsPage />} />
        <Route path="/settings/docs/:topic" element={<DocsTopicPage />} />
        <Route path="/settings/data" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AppShell>
  )
}
