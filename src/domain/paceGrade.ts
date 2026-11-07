/**
 * Pace + uphill grade estimate for walking/running, above resting metabolism.
 *
 * Level-ground METs are representative 2024 Adult Compendium values,
 * interpolated for a continuous preview:
 * https://pacompendium.com/walking/
 * https://pacompendium.com/running/
 * Uphill-only oxygen component follows ACSM:
 *   walking: 1.8 × speed(m/min) × grade(fraction)
 *   running: 0.9 × speed(m/min) × grade(fraction)
 *
 * Not a clinical measurement. A missing grade means an explicit assumed
 * level-ground model (0%), NOT a logged measurement of zero incline.
 */
export type PaceActivity = 'Walking' | 'Running'
type PacePoint = readonly [kmh: number, met: number]

export const DEFAULT_PACE_KMH: Record<PaceActivity, number> = {
  Walking: 5,
  Running: 10
}

const PACE_MET: Record<PaceActivity, readonly PacePoint[]> = {
  Walking: [[2, 2.3], [3.5, 2.8], [4, 3.0], [5, 3.8], [6, 4.8], [7, 5.8], [8, 8.3]],
  Running: [[6, 6.5], [7.5, 7.8], [8.2, 8.5], [9.2, 9.0], [10, 9.3],
    [11, 10.5], [12, 11.8], [14, 13], [16, 14.8], [18, 16.8], [22, 23], [25, 23]]
}
export const PACE_SPEED_BOUNDS: Record<PaceActivity, readonly [number, number]> = {
  Walking: [2, 8],
  Running: [6, 25]
}
/**
 * Walking/running input uses degrees (°), but historical records and backups
 * keep grade in percent. A 10° angle corresponds to about 17.6% grade.
 */
export const MAX_INCLINE_DEGREES = 15
export function degreesToGradePercent(degrees: number): number {
  return Math.tan(degrees * Math.PI / 180) * 100
}
export function gradePercentToDegrees(percent: number): number {
  return Math.atan(percent / 100) * 180 / Math.PI
}
export const MAX_INCLINE_PERCENT = degreesToGradePercent(MAX_INCLINE_DEGREES)

export function validPaceSpeed(activity: PaceActivity, kmh: number): boolean {
  const [min, max] = PACE_SPEED_BOUNDS[activity]
  return Number.isFinite(kmh) && kmh >= min && kmh <= max
}
export function validUphillGrade(grade: number): boolean {
  return Number.isFinite(grade) && grade >= 0 && grade <= MAX_INCLINE_PERCENT
}

/** Continuous interpolation only between Compendium pace anchors; no extrapolation. */
export function metForPace(activity: PaceActivity, kmh: number): number | null {
  if (!validPaceSpeed(activity, kmh)) return null
  const points = PACE_MET[activity]
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!
    const next = points[i]!
    if (kmh <= next[0]) {
      const fraction = (kmh - previous[0]) / (next[0] - previous[0])
      return previous[1] + (next[1] - previous[1]) * fraction
    }
  }
  return points.at(-1)![1]
}

/**
 * Precedence: explicitly entered speed; else actual distance/time; else
 * representative default speed. An entered speed overrides time *for the
 * energy computation* if distance is present, but never rewrites logged time.
 */
export function speedForEstimate(
  activity: PaceActivity, distanceKm: number | null, durationMinutes: number | null,
  speedKmh: number | null
): number | null {
  if (speedKmh !== null) return validPaceSpeed(activity, speedKmh) ? speedKmh : null
  if (distanceKm !== null && durationMinutes !== null && durationMinutes > 0) {
    const derived = distanceKm * 60 / durationMinutes
    return validPaceSpeed(activity, derived) ? derived : null
  }
  return DEFAULT_PACE_KMH[activity]
}

export function paceGradeNetKcal(
  activity: PaceActivity, weightKg: number, distanceKm: number | null,
  durationMinutes: number | null, speedKmh: number | null,
  inclinePercent: number | null
): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 ||
      (distanceKm !== null && (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 300)) ||
      (durationMinutes !== null && (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440)) ||
      (distanceKm === null && durationMinutes === null)) return null
  // The canonical stored percent is converted from the entered angle via tan(°).
  const grade = inclinePercent ?? 0
  if (!validUphillGrade(grade)) return null
  const speed = speedForEstimate(activity, distanceKm, durationMinutes, speedKmh)
  if (speed === null) return null
  const met = metForPace(activity, speed)
  if (met === null) return null
  // When a distance exists, derive calculation time from distance + pace,
  // leaving the *recorded* duration intact, even if it disagrees.
  const estimatedMinutes = distanceKm !== null ? distanceKm / speed * 60 : durationMinutes
  if (estimatedMinutes === null || estimatedMinutes <= 0) return null
  const metersPerMinute = speed * 1000 / 60
  const verticalOxygen = (activity === 'Walking' ? 1.8 : 0.9) * metersPerMinute * (grade / 100)
  const netOxygen = (met - 1) * 3.5 + verticalOxygen
  return Math.max(0, netOxygen) * weightKg / 200 * estimatedMinutes
}
