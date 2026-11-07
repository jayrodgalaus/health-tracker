import { useEffect, useState } from 'react'
import type { Profile } from '../domain/models'
import { toLocalDay } from '../lib/localDate'
import { DayDetailPage } from './DayDetailPage'

/**
 * Today is the exact Calendar day-detail view for the device's current local
 * day, never an independently maintained dashboard or historical query date.
 */
export function TodayPage({ profile }: { profile: Profile }) {
  const [today, setToday] = useState(() => toLocalDay(new Date()))

  useEffect(() => {
    let rollover: number | undefined
    function syncLocalDate() {
      setToday(toLocalDay(new Date()))
      window.clearTimeout(rollover)
      const now = new Date()
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      // Refresh on local midnight; also recheck on app focus after sleep.
      rollover = window.setTimeout(syncLocalDate, Math.max(100, nextDay.getTime() - now.getTime() + 100))
    }
    function syncWhenVisible() {
      if (document.visibilityState === 'visible') syncLocalDate()
    }
    syncLocalDate()
    window.addEventListener('focus', syncLocalDate)
    document.addEventListener('visibilitychange', syncWhenVisible)
    return () => {
      window.clearTimeout(rollover)
      window.removeEventListener('focus', syncLocalDate)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [])

  return <DayDetailPage profile={profile} selectedDayKey={today} />
}
