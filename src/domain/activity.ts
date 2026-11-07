import type { ExerciseEntry, LocalDay, WeightEntry } from './models'
import { parseLocalDay, toLocalDay } from '../lib/localDate'
import { paceGradeNetKcal, speedForEstimate } from './paceGrade'

/**
 * Deterministic exercise calculations. There are NO IndexedDB, network or React
 * dependencies. Model: the Guide v1.0 §6.5; net MET kcal ≈ max(0,MET−1) ×
 * 3.5 × recorded kg / 200 × duration in minutes (approximate 1 MET oxygen use).
 * These are only INCREMENTS above resting activity. Never add gross calories to
 * background expenditure, or claim they are measured kcal.
 */

/**
 * Coarse flat-ground adult walking/running energy factors. Distance is
 * preferred when recorded. These describe net energy ABOVE rest, not gross
 * calories: the factors approximate Compendium (2024) walking ~3.8 MET
 * near 5 km/h and running ~9.3 MET near 10 km/h, rounded to 0.6/0.9
 * kcal per kg per km, respectively.
 * https://pacompendium.com/walking/ and https://pacompendium.com/running/
 */
export type DistanceActivity = 'Walking' | 'Running'
export const WALK_RUN_TIME_MET: Record<DistanceActivity, number> = {
  Walking: 3.8,
  Running: 9.3
}
export const WALK_RUN_DISTANCE_NET_KCAL_PER_KG_KM: Record<DistanceActivity, number> = {
  Walking: 0.6,
  Running: 0.9
}
export function isDistanceActivity(activity: string): activity is DistanceActivity {
  return activity === 'Walking' || activity === 'Running'
}
export function netDistanceKcal(activity: DistanceActivity, kg: number, distanceKm: number): number | null {
  if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(distanceKm) ||
      distanceKm <= 0 || distanceKm > 300) return null
  return WALK_RUN_DISTANCE_NET_KCAL_PER_KG_KM[activity] * kg * distanceKm
}

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
  if (matches.length !== 1 || !measurement || !Number.isFinite(measurement.weightKg) || measurement.weightKg < 10 || measurement.weightKg > 500) {
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
  method: 'distanceNet' | 'activityTimeNet' | 'paceGradeNet' | 'metNet' | 'manualActive' | 'unknown'
  weight: WeightEvidence | null
  explanation: string
}

/**
 * The exact same pure estimate is called by the exercise form preview, Today,
 * Calendar and Trends. No distance is silently converted into measured minutes.
 */
export function estimateWorkout(entry: ExerciseEntry, weights: readonly WeightEntry[], eligibleAdult: boolean): WorkoutEstimate {
  if (!eligibleAdult) {
    return { kcal: null, method: 'unknown', weight: null, explanation: 'Adult-oriented exercise energy estimate not available for a minor or unconfirmed adult age.' }
  }
  if (entry.estimationMethod === 'manualActive') {
    const kcal = entry.estimatedEnergyKcal
    if (kcal !== null && Number.isFinite(kcal) && kcal >= 0 && kcal <= 6000) {
      return {
        kcal, method: 'manualActive', weight: null,
        explanation: 'User-entered ACTIVE/incremental workout kcal, not gross/device-total kcal. Approximate; no other workout estimate added.'
      }
    }
  }
  if (entry.estimationMethod === 'paceGradeNet') {
    const weight = weightForDay(entry.dayKey, weights)
    const distance = entry.distanceKm ?? null
    const duration = entry.durationMinutes
    const pace = entry.speedKmh ?? null
    const incline = entry.inclinePercent ?? null
    const activity = entry.activity
    const kcal = isDistanceActivity(activity) && weight.weightKg !== null
      ? paceGradeNetKcal(activity, weight.weightKg, distance, duration, pace, incline)
      : null
    const effectiveSpeed = isDistanceActivity(activity)
      ? speedForEstimate(activity, distance, duration, pace) : null
    const speedSource = pace !== null ? 'entered'
      : distance !== null && duration !== null ? 'calculated from distance and time'
      : 'representative default'
    return {
      kcal, method: 'paceGradeNet', weight,
      explanation: kcal === null
        ? 'Pace/grade estimate unavailable: a valid walking/running distance or duration, supported speed/grade, and an unambiguous weight recorded on or before the date are required.'
        : `Approximate net above-rest kcal from ${activity.toLowerCase()} at ${Number(effectiveSpeed!.toFixed(2))} km/h (${speedSource}), ${incline === null ? 'assumed level ground' : incline + '% uphill grade'}, and ${distance !== null ? distance + ' km' : duration + ' recorded min'}. Pace-based 2024 Adult Compendium MET plus ACSM uphill oxygen component. Weight ${weight.weightKg} kg ${weight.source === 'carriedForward' ? 'carried forward from ' + weight.sourceDay : 'recorded on ' + entry.dayKey}. Only one workout energy estimate is counted; speed overrides recorded duration for energy when distance is present.`
    }
  }
  if (entry.estimationMethod === 'distanceNet') {
    const weight = weightForDay(entry.dayKey, weights)
    const distance = entry.distanceKm ?? null
    const kcal = isDistanceActivity(entry.activity) && weight.weightKg !== null && distance !== null
      ? netDistanceKcal(entry.activity, weight.weightKg, distance) : null
    return {
      kcal, method: 'distanceNet', weight,
      explanation: kcal === null
        ? 'Distance estimate unavailable: a valid walking/running distance and recorded weight on or before this date are required.'
        : `Approximate net kcal = ${WALK_RUN_DISTANCE_NET_KCAL_PER_KG_KM[entry.activity as DistanceActivity]} kcal/(kg·km) × ${weight.weightKg} kg × ${distance} km. Weight ${weight.source === 'carriedForward' ? `carried forward from ${weight.sourceDay}` : `recorded on ${entry.dayKey}`}. Distance is used even if duration was also logged; duration contributes no extra kcal.`
    }
  }
  if (entry.estimationMethod === 'activityTimeNet') {
    const weight = weightForDay(entry.dayKey, weights)
    const duration = entry.durationMinutes
    const kcal = isDistanceActivity(entry.activity) && weight.weightKg !== null &&
      duration !== null && Number.isFinite(duration) && duration > 0
      ? netMetKcal(WALK_RUN_TIME_MET[entry.activity], weight.weightKg, duration) : null
    return {
      kcal, method: 'activityTimeNet', weight,
      explanation: kcal === null
        ? 'Time estimate unavailable: walking/running duration and a recorded weight on or before this date are required.'
        : `Approximate net kcal from a default ${WALK_RUN_TIME_MET[entry.activity as DistanceActivity]} MET ${entry.activity.toLowerCase()} assumption and ${duration} min: (MET − 1) × 3.5 × ${weight.weightKg} kg / 200 × duration. Weight ${weight.source === 'carriedForward' ? `carried forward from ${weight.sourceDay}` : `recorded on ${entry.dayKey}`}.`
    }
  }
  if (entry.estimationMethod === 'metNet') {
    const weight = weightForDay(entry.dayKey, weights)
    const duration = entry.durationMinutes
    const kcal = entry.met == null || weight.weightKg === null || duration === null
      ? null : netMetKcal(entry.met, weight.weightKg, duration)
    return {
      kcal, method: 'metNet', weight,
      explanation: kcal === null
        ? 'MET increment unavailable: a valid MET, measured duration and unambiguous recorded weight on or before this date are required.'
        : `Approximate incremental kcal = max(0, ${entry.met} MET − 1) × 3.5 × ${weight.weightKg} kg / 200 × ${duration} min. Weight ${weight.source === 'carriedForward' ? `carried forward from ${weight.sourceDay}` : `recorded on ${entry.dayKey}`}; no future measurement used.`
    }
  }
  return { kcal: null, method: 'unknown', weight: null, explanation: 'No supported active-calorie method selected; energy unknown.' }
}

export interface ActivityDaySummary {
  dayKey: LocalDay
  entries: number
  /** Null when no activity has been logged; no log is not zero activity. */
  loggedMinutes: number | null
  /** A distance-only workout has unknown time, not zero minutes. */
  missingDurationEntries: number
  knownIncrementalKcal: number | null
  knownEnergyEntries: number
  unknownEnergyEntries: number
  energyCoverageComplete: boolean
}

export function calculateActivityDay(day: LocalDay, activities: readonly ExerciseEntry[], weights: readonly WeightEntry[], eligibleAdult: boolean): ActivityDaySummary {
  const dayEntries = activities.filter(entry => entry.dayKey === day)
  const estimates = dayEntries.map(entry => estimateWorkout(entry, weights, eligibleAdult))
  const known = estimates.filter((e): e is WorkoutEstimate & { kcal: number } => e.kcal !== null)
  const durations = dayEntries.map(entry => entry.durationMinutes).filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)
  return {
    dayKey: day,
    entries: dayEntries.length,
    loggedMinutes: durations.length ? durations.reduce((sum, value) => sum + value, 0) : null,
    missingDurationEntries: dayEntries.length - durations.length,
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
  missingDurationEntries: number
  lightMinutes: number | null
  moderateMinutes: number | null
  vigorousMinutes: number | null
  unclassifiedMinutes: number | null
  loggedStrengthDays: number | null
}

export function calculateActivityWeek(day: LocalDay, activities: readonly ExerciseEntry[]): ActivityWeekSummary {
  const { start, end } = weekBounds(day)
  const week = activities.filter(entry => entry.dayKey >= start && entry.dayKey <= end)
  const durations = week.map(entry => entry.durationMinutes)
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)
  const sum = (intensity: ExerciseEntry['intensity']) => {
    const group = week.filter(entry => (entry.intensity ?? null) === intensity)
    if (group.length === 0) return 0
    const known = group.map(entry => entry.durationMinutes)
      .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)
    return known.length ? known.reduce((total, value) => total + value, 0) : null
  }
  return {
    start, end, entries: week.length,
    loggedMinutes: durations.length ? durations.reduce((total, value) => total + value, 0) : null,
    missingDurationEntries: week.length - durations.length,
    lightMinutes: week.length ? sum('light') : null,
    moderateMinutes: week.length ? sum('moderate') : null,
    vigorousMinutes: week.length ? sum('vigorous') : null,
    unclassifiedMinutes: week.length ? sum(null) : null,
    loggedStrengthDays: week.length ? new Set(week.filter(entry => entry.isStrengthTraining === true).map(entry => entry.dayKey)).size : null
  }
}
