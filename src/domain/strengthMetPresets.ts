/**
 * Adult Compendium of Physical Activities (2024), Conditioning Exercise.
 * These are reference activity-level METs, not personalized measurements.
 * Source: https://pacompendium.com/conditioning-exercise/
 */
export const STRENGTH_MET_PRESETS = [
  { code: '02056', label: 'Bodyweight resistance, general', met: 3.0 },
  { code: '02054', label: 'Mixed weight training, 8–15 reps', met: 3.5 },
  { code: '02052', label: 'Squats or deadlifts', met: 5.0 },
  { code: '02055', label: 'Circuit resistance training / supersets', met: 5.8 },
  { code: '02050', label: 'Vigorous lifting / powerlifting / bodybuilding', met: 6.0 },
  { code: '02057', label: 'High-intensity bodyweight resistance', met: 6.5 },
  { code: '02058', label: 'Kettlebell swings', met: 9.8 }
] as const

export type StrengthMetPreset = typeof STRENGTH_MET_PRESETS[number]

/** Historical workouts persist the numeric MET; matching an old value is safe. */
export function strengthMetPresetForValue(value: number | null | undefined): StrengthMetPreset | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined
  return STRENGTH_MET_PRESETS.find(preset => preset.met === value)
}
