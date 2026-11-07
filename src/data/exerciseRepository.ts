import { db, type HealthTrackerDatabase } from '../db/database'
import { assertDayEditable } from './dayRepository'
import type { ExerciseEnergyMethod, ExerciseEntry, ExerciseIntensity, LocalDay } from '../domain/models'
import { isDistanceActivity, weekBounds } from '../domain/activity'
import { validPaceSpeed, validUphillGrade } from '../domain/paceGrade'
import { assertLocalDay } from '../domain/profile'
import { toLocalDay } from '../lib/localDate'

/** All validation runs before IndexedDB writes; no persistent computed daily totals. */
export interface ExerciseDraft {
  dayKey: LocalDay
  activity: string
  /** Optional for walking/running when distance is recorded. */
  durationMinutes: number | null
  distanceKm?: number | null
  /** Optional pace (km/h) and uphill slope (%) for walking/running only. */
  speedKmh?: number | null
  inclinePercent?: number | null
  /** Legacy field retained to avoid losing historical labels; new forms use null. */
  intensity: ExerciseIntensity | null
  calorieMethod: ExerciseEnergyMethod
  /** Only for method=metNet, chosen and supplied by the user. */
  met: number | null
  /** Only ACTIVE/incremental kcal, never gross device-reported kcal. */
  manualActiveKcal: number | null
  isStrengthTraining: boolean
  timeOfDay: string | null
  notes: string | null
}

export function validateExerciseDraft(draft: ExerciseDraft, today: LocalDay): void {
  assertLocalDay(draft.dayKey, 'Exercise date')
  if (draft.dayKey > today) throw new Error('Cannot log exercise on a future date.')
  const activity = draft.activity.trim()
  if (!activity || activity.length > 120) throw new Error('Exercise name must be 1 to 120 characters.')
  if (draft.durationMinutes !== null &&
      (!Number.isFinite(draft.durationMinutes) || draft.durationMinutes <= 0 || draft.durationMinutes > 1440)) {
    throw new Error('Duration must be greater than zero and no more than 1,440 minutes.')
  }
  const distance = draft.distanceKm ?? null
  const walkRun = isDistanceActivity(activity)
  if (distance !== null && (!Number.isFinite(distance) || distance <= 0 || distance > 300)) {
    throw new Error('Distance must be greater than zero and no more than 300 km.')
  }
  if (!walkRun && distance !== null) throw new Error('Distance is supported for walking and running only.')
  const speed = draft.speedKmh ?? null
  const grade = draft.inclinePercent ?? null
  if (!walkRun && (speed !== null || grade !== null)) {
    throw new Error('Speed and incline apply to walking and running only.')
  }
  if (walkRun && speed !== null && !validPaceSpeed(activity, speed)) {
    throw new Error(activity === 'Walking'
      ? 'Walking speed must be between 2 and 8 km/h.'
      : 'Running speed must be between 6 and 25 km/h.')
  }
  if (grade !== null && !validUphillGrade(grade)) {
    throw new Error('Incline must be between 0% and 15% (uphill only).')
  }
  if (draft.durationMinutes === null && (!walkRun || distance === null)) {
    throw new Error(walkRun ? 'Enter duration or distance for walking/running.' : 'Enter a duration for this activity.')
  }
  if (draft.intensity !== null && !['light', 'moderate', 'vigorous'].includes(draft.intensity)) {
    throw new Error('Choose a valid intensity or leave it unspecified.')
  }
  if (typeof draft.isStrengthTraining !== 'boolean') throw new Error('Invalid strength-training selection.')
  if (draft.timeOfDay !== null && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.timeOfDay)) {
    throw new Error('Time must be an HH:MM local clock time.')
  }
  if (draft.notes !== null && draft.notes.length > 500) throw new Error('Notes must be no longer than 500 characters.')
  if (draft.calorieMethod === 'unknown') {
    if (draft.met !== null || draft.manualActiveKcal !== null) {
      throw new Error('Unknown energy method must not contain calorie or MET data.')
    }
  } else if (draft.calorieMethod === 'paceGradeNet') {
    if (!walkRun || draft.met !== null || draft.manualActiveKcal !== null) {
      throw new Error('Speed/incline estimate requires walking or running, without a manual MET or kcal amount.')
    }
  } else if (draft.calorieMethod === 'metNet') {
    if (draft.durationMinutes === null) throw new Error('A duration is required for MET calculations.')
    if (draft.met === null || !Number.isFinite(draft.met) || draft.met < 1 || draft.met > 25 ||
        draft.manualActiveKcal !== null) {
      throw new Error('MET estimate requires a user-selected MET from 1 to 25 and no manual calories.')
    }
  } else if (draft.calorieMethod === 'distanceNet' || draft.calorieMethod === 'activityTimeNet') {
    if (!walkRun || draft.manualActiveKcal !== null || draft.met !== null ||
        (draft.calorieMethod === 'distanceNet' && distance === null) ||
        (draft.calorieMethod === 'activityTimeNet' && (draft.durationMinutes === null || distance !== null))) {
      throw new Error('Automatic walk/run estimate needs the matching distance or time input, without manual calories or MET.')
    }
  } else if (draft.calorieMethod === 'manualActive') {
    if (draft.manualActiveKcal === null || !Number.isFinite(draft.manualActiveKcal) ||
        draft.manualActiveKcal < 0 || draft.manualActiveKcal > 6000 || draft.met !== null) {
      throw new Error('Manual ACTIVE/incremental calories must be between 0 and 6,000 kcal, without a MET value.')
    }
  } else {
    throw new Error('Unsupported exercise energy method.')
  }
}

export async function listExerciseForDay(dayKey: LocalDay, database: HealthTrackerDatabase = db): Promise<ExerciseEntry[]> {
  assertLocalDay(dayKey)
  const entries = await database.exerciseEntries.where('dayKey').equals(dayKey).toArray()
  return entries.sort((a, b) => (a.timeOfDay ?? '').localeCompare(b.timeOfDay ?? '') || a.createdAt.localeCompare(b.createdAt))
}

export async function listExerciseForWeek(dayKey: LocalDay, database: HealthTrackerDatabase = db): Promise<ExerciseEntry[]> {
  assertLocalDay(dayKey)
  const { start, end } = weekBounds(dayKey)
  return database.exerciseEntries.where('dayKey').between(start, end, true, true).toArray()
}

/**
 * Keep Phase 0 ID-based records; no schema change required.
 * MET energy stays derived at read time so weight edits update estimates.
 */
export async function saveExercise(
  draft: ExerciseDraft,
  id?: string,
  database: HealthTrackerDatabase = db,
  today: LocalDay = toLocalDay(new Date())
): Promise<ExerciseEntry> {
  validateExerciseDraft(draft, today)
  return database.transaction('rw', database.exerciseEntries, database.dayReviews, async () => {
    const previous = id ? await database.exerciseEntries.get(id) : undefined
    if (id && !previous) throw new Error('This exercise entry no longer exists.')
    await assertDayEditable(draft.dayKey, database)
    if (previous && previous.dayKey !== draft.dayKey) await assertDayEditable(previous.dayKey, database)
    const now = new Date().toISOString()
    const entry: ExerciseEntry = {
      id: previous?.id ?? crypto.randomUUID(),
      dayKey: draft.dayKey,
      activity: draft.activity.trim(),
      durationMinutes: draft.durationMinutes,
      distanceKm: draft.distanceKm ?? null,
      speedKmh: draft.speedKmh ?? null,
      inclinePercent: draft.inclinePercent ?? null,
      intensity: draft.intensity,
      estimatedEnergyKcal: draft.calorieMethod === 'manualActive' ? draft.manualActiveKcal : null,
      estimationMethod: draft.calorieMethod,
      met: draft.calorieMethod === 'metNet' ? draft.met : null,
      isStrengthTraining: draft.isStrengthTraining,
      timeOfDay: draft.timeOfDay,
      notes: draft.notes?.trim() || null,
      startedAt: previous?.startedAt ?? now,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now
    }
    await database.exerciseEntries.put(entry)
    return entry
  })
}

export async function deleteExercise(id: string, database: HealthTrackerDatabase = db): Promise<void> {
  await database.transaction('rw', database.exerciseEntries, database.dayReviews, async () => {
    const prior = await database.exerciseEntries.get(id)
    if (prior) {
      await assertDayEditable(prior.dayKey, database)
      await database.exerciseEntries.delete(id)
    }
  })
}
