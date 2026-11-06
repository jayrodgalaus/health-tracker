import type { LocalDay } from '../domain/models'

/** Always use the user's local calendar date, not toISOString().slice(0, 10). */
export function toLocalDay(date: Date): LocalDay {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Strict parse; avoids Date.parse('YYYY-MM-DD') interpreting UTC midnight. */
export function parseLocalDay(dayKey: LocalDay): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}
