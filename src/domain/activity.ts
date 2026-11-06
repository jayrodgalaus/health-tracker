import type { ExerciseEntry, LocalDay, WeightEntry } from './models'
import { parseLocalDay, toLocalDay } from '../lib/localDate'

/**
 * Deterministic exercise calculations. There are NO IndexedDB, network or React
 * dependencies. Model: the Guide v1.0 §6.5; net MET kcal ≈ max(0,MET−1) ×
 * 3.5 × recorded kg / 200 × duration in minutes (approximate 1 MET oxygen use).
 * These are only INCREMENTS above resting activity. Never add gross calories to
 * background expenditure, or claim they are measured kcal.
 */

export type WeightEvidence = {
  weightKg: number | null
  sourceDay: LocalDay | null
  source: 'sameDay' | 'carriedForward' | 'missing' | 'ambiguous'
}

/** Never use a later weight for an earlier workout. Reject duplicate primary dates. */
export function weightForDay(day: LocalDay, weights: readonly WeightEntry[]): WeightEvidence {
  const eligible = weights.filter(w => w.dayKey <= day && parseLocalDay(w.dayKey) !== null)
  if (!eligible.length) return { weightKg: null, sourceDay: null, source: 'missing' }
  const latest = eligible.map(entry => entry.dayKey).sort().at(-1)
  if (!latest) return { weightKg: null, sourceDay: null, source: 'missing' }
  const matches = eligible.filter(entry => entry.dayKey === latest)
  const measurement = matches[0]
  if (matches.length !== 1 || !measurement || !Number.isFinite(measurement.weightKg) || measurement.weightKg <= 0) {
    return { weightKg: null, sourceDay: latest, source: 'ambiguous' }
  }
  return { weightKg: measurement.weightKg, sourceDay: latest, source: latest === day ? 'sameDay' : 'carriedForward' }
}

/** Net kcal above rest, not total/gross workout kcal. No premature rounding. */
export function netMetKcal(met: number, kg: number, minutes: number): number | null {
  if (![met, kg, minutes].every(Number.isFinite) || met < 1 || met > 25 || kg <= 0 || minutes <= 0) {
    return null
  }
  return Math.max(0, met - 1) * 3.5 * kg / 200 * minutes
}

export interface WorkoutEstimate {
  kcal: number | null
  method: 'metNet' | 'manualActive' | 'unknown'
  weight: WeightEvidence | null
  explanation: string
}

export function estimateWorkout(entry: ExerciseEntry, weights: readonly WeightEntry[]): WorkoutEstimate {
  if (!Number.isFinite(entry.durationMinutes) || entry.durationMinutes <= 0) {
    return { kcal: null, method: 'unknown', weight: null, explanation: 'Invalid or missing duration; no energy calculation.' }
  }
  if (entry.estimationMethod === 'manualActive') {
    const kcal = entry.estimatedEnergyKcal
    if (kcal !== null && Number.isFinite(kcal) && kcal >= 0) {
      return {
        kcal, method: 'manualActive', weight: null,
        explanation: 'User-entered ACTIVE/incremental workout kcal, not gross/device-total kcal. Approximate; no MET calculation added.'
      }
    }
  }
  if (entry.estimationMethod === 'metNet') {
    const weight = weightForDay(entry.dayKey, weights)
    const kcal = entry.met == null || weight.weightKg === null ? null : netMetKcal(entry.met, weight.weightKg, entry.durationMinutes)
    return {
      kcal, method: 'metNet', weight,
      explanation: kcal === null
        ? 'MET increment unavailable: a valid MET and an unambiguous recorded weight on or before this date are required.'
        : `Approximate incremental kcal = max(0, ${entry.met} MET − 1) × 3.5 × ${weight.weightKg} kg / 200 × ${entry.durationMinutes} min. Weight ${weight.source === 'carriedForward' ? `carried forward from ${weight.sourceDay}` : `recorded on ${entry.dayKey}`}; no future measurement used.`
    }
  }
  return { kcal: null, method: 'unknown', weight: null, explanation: 'No supported active-calorie method selected; energy unknown.' }
}

export interface ActivityDaySummary {
  dayKey: LocalDay
  entries: number
  /** Null when no activity has been logged; no log is not zero activity. */
  loggedMinutes: number | null
  knownIncrementalKcal: number | null
  knownEnergyEntries: number
  unknownEnergyEntries: number
  energyCoverageComplete: boolean
}

export function calculateActivityDay(day: LocalDay, activities: readonly ExerciseEntry[], weights: readonly WeightEntry[]): ActivityDaySummary {
  const dayEntries = activities.filter(entry => entry.dayKey === day)
  const estimates = dayEntries.map(entry => estimateWorkout(entry, weights))
  const known = estimates.filter((e): e is WorkoutEstimate & { kcal: number } => e.kcal !== null)
  return {
    dayKey: day,
    entries: dayEntries.length,
    loggedMinutes: dayEntries.length ? dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0) : null,
    knownIncrementalKcal: known.length ? known.reduce((sum, entry) => sum + entry.kcal, 0) : null,
    knownEnergyEntries: known.length,
    unknownEnergyEntries: dayEntries.length - known.length,
    energyCoverageComplete: dayEntries.length > 0 && known.length === dayEntries.length
  }
}

/** Week boundaries are local MONDAY–SUNDAY, without UTC date slicing. */
export function weekBounds(day: LocalDay): { start: LocalDay; end: LocalDay } {
  const start = parseLocalDay(day)
  if (!start) throw new Error('A valid local day is required.')
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  const end = new Date(start.getTime())
  end.setDate(end.getDate() + 6)
  return { start: toLocalDay(start), end: toLocalDay(end) }
}

export interface ActivityWeekSummary {
  start: LocalDay
  end: LocalDay
  entries: number
  loggedMinutes: number | null
  lightMinutes: number | null
  moderateMinutes: number | null
  vigorousMinutes: number | null
  unclassifiedMinutes: number | null
  loggedStrengthDays: number | null
}

export function calculateActivityWeek(day: LocalDay, activities: readonly ExerciseEntry[]): ActivityWeekSummary {
  const { start, end } = weekBounds(day)
  const week = activities.filter(entry => entry.dayKey >= start && entry.dayKey <= end)
  const sum = (intensity: ExerciseEntry['intensity']) => week
    .filter(entry => (entry.intensity ?? null) === intensity)
    .reduce((total, entry) => total + entry.durationMinutes, 0)
  return {
    start, end, entries: week.length,
    loggedMinutes: week.length ? week.reduce((total, entry) => total + entry.durationMinutes, 0) : null,
    lightMinutes: week.length ? sum('light') : null,
    moderateMinutes: week.length ? sum('moderate') : null,
    vigorousMinutes: week.length ? sum('vigorous') : null,
    unclassifiedMinutes: week.length ? sum(null) : null,
    loggedStrengthDays: week.length ? new Set(week.filter(entry => entry.isStrengthTraining === true).map(entry => entry.dayKey)).size : null
  }
}
