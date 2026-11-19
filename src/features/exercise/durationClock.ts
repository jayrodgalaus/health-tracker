/** UI-only conversion. Exercise calculations and storage stay in decimal minutes. */
export interface DurationClock { minutes: number; seconds: number }
export const MAX_DURATION_MINUTES = 1440
export const SECONDS_PER_MINUTE = 60

/** An unentered duration remains null, even though its picker displays 00:00. */
export function clockFromMinutes(raw: string): DurationClock | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0 || value > MAX_DURATION_MINUTES) return null
  const seconds = Math.round(value * SECONDS_PER_MINUTE)
  return { minutes: Math.floor(seconds / SECONDS_PER_MINUTE), seconds: seconds % SECONDS_PER_MINUTE }
}

/** Return an empty string for 00:00; it must not count as a logged zero workout. */
export function minutesFromClock(minutes: number, seconds: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_DURATION_MINUTES ||
      !Number.isInteger(seconds) || seconds < 0 || seconds > 59 ||
      (minutes === MAX_DURATION_MINUTES && seconds !== 0)) {
    throw new Error('Duration must be between 00:00 and 1440:00.')
  }
  const totalSeconds = minutes * SECONDS_PER_MINUTE + seconds
  return totalSeconds === 0 ? '' : String(totalSeconds / SECONDS_PER_MINUTE)
}

export function clockDigits(value: number): string {
  return String(value).padStart(2, '0')
}
