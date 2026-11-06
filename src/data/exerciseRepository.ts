import { db, type HealthTrackerDatabase } from '../db/database'
import type { ExerciseEnergyMethod, ExerciseEntry, ExerciseIntensity, LocalDay } from '../domain/models'
import { weekBounds } from '../domain/activity'
import { assertLocalDay } from '../domain/profile'
import { toLocalDay } from '../lib/localDate'

/** All validation runs before IndexedDB writes; no persistent computed daily totals. */
export interface ExerciseDraft {
  dayKey: LocalDay
  activity: string
  durationMinutes: number
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
  if (!Number.isFinite(draft.durationMinutes) || draft.durationMinutes <= 0 || draft.durationMinutes > 1440) {
    throw new Error('Duration must be greater than zero and no more than 1,440 minutes.')
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
  } else if (draft.calorieMethod === 'metNet') {
    if (draft.met === null || !Number.isFinite(draft.met) || draft.met < 1 || draft.met > 25 ||
        draft.manualActiveKcal !== null) {
      throw new Error('MET estimate requires a user-selected MET from 1 to 25 and no manual calories.')
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
  return database.transaction('rw', database.exerciseEntries, async () => {
    const previous = id ? await database.exerciseEntries.get(id) : undefined
    if (id && !previous) throw new Error('This exercise entry no longer exists.')
    const now = new Date().toISOString()
    const entry: ExerciseEntry = {
      id: previous?.id ?? crypto.randomUUID(),
      dayKey: draft.dayKey,
      activity: draft.activity.trim(),
      durationMinutes: draft.durationMinutes,
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
  await database.exerciseEntries.delete(id)
}
