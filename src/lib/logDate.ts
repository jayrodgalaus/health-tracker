import { parseLocalDay, toLocalDay } from './localDate'

/** A link from Today/Calendar can preselect a historical log date safely. */
export function selectedLogDay(candidate: string | null, today = toLocalDay(new Date())): string {
  return candidate && parseLocalDay(candidate) && candidate >= '1900-01-01' && candidate <= today
    ? candidate : today
}
