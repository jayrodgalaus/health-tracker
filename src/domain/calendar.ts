import type { LocalDay } from './models'
import { parseLocalDay, toLocalDay } from '../lib/localDate'

export function monthDays(monthKey: string): LocalDay[] {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('Expected YYYY-MM month.')
  const start = parseLocalDay(monthKey + '-01')
  if (!start) throw new Error('Invalid calendar month.')
  const length = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12).getDate()
  return Array.from({ length }, (_, index) => toLocalDay(new Date(start.getFullYear(), start.getMonth(), index + 1, 12)))
}

/** Six or fewer full Monday-first rows; adjacent-month cells are null (not fake days). */
export function monthGrid(monthKey: string): (LocalDay | null)[][] {
  const days = monthDays(monthKey)
  const start = parseLocalDay(days[0]!)
  if (!start) throw new Error('Invalid month.')
  const mondayOffset = (start.getDay() + 6) % 7
  const slots: (LocalDay | null)[] = [...Array<null>(mondayOffset).fill(null), ...days]
  while (slots.length % 7 !== 0) slots.push(null)
  const rows: (LocalDay | null)[][] = []
  for (let i = 0; i < slots.length; i += 7) rows.push(slots.slice(i, i + 7))
  return rows
}

export function shiftMonth(monthKey: string, distance: number): string {
  if (!Number.isInteger(distance) || Math.abs(distance) > 12) throw new Error('Invalid month shift.')
  const first = parseLocalDay(monthKey + '-01')
  if (!first) throw new Error('Invalid calendar month.')
  const result = new Date(first.getFullYear(), first.getMonth() + distance, 1, 12)
  return toLocalDay(result).slice(0, 7)
}

export function addLocalDays(dayKey: LocalDay, distance: number): LocalDay {
  if (!Number.isInteger(distance) || Math.abs(distance) > 366) throw new Error('Invalid day shift.')
  const date = parseLocalDay(dayKey)
  if (!date) throw new Error('Invalid calendar date.')
  date.setDate(date.getDate() + distance)
  return toLocalDay(date)
}
