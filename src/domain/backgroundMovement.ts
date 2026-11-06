/**
 * Everyday movement examples are UI presets for a deliberately rough
 * non-workout energy estimate, not validated activity classifications.
 * Gross, conventional workout-inclusive PAL/TDEE factors are intentionally
 * NOT used, because workout net calories are added separately.
 */
export interface BackgroundMovementPreset {
  value: number
  label: string
  range: string
  examples: string
}

export const BACKGROUND_MOVEMENT_PRESETS: readonly BackgroundMovementPreset[] = [
  {
    value: 1,
    label: 'Resting-only baseline',
    range: '×1.00',
    examples: 'Essentially a resting baseline, with no extra allowance for everyday movement'
  },
  {
    value: 1.1,
    label: 'Mostly seated',
    range: '×1.01–1.10',
    examples: 'Sitting most of the day with brief standing, walking or chores'
  },
  {
    value: 1.2,
    label: 'Light everyday movement',
    range: '×1.11–1.25',
    examples: 'Some walking, household chores or occasional errands'
  },
  {
    value: 1.35,
    label: 'Standing or walking regularly',
    range: '×1.26–1.40',
    examples: 'Being on your feet and moving around for several hours'
  },
  {
    value: 1.5,
    label: 'On your feet much of the day',
    range: '×1.41–1.55',
    examples: 'Frequent standing, walking or physical tasks throughout the day'
  },
  {
    value: 1.6,
    label: 'Very demanding everyday routine',
    range: '×1.56–1.60',
    examples: 'Physically demanding non-workout tasks during much of the day'
  }
]

/** Exact saved numeric values: do not coerce old values to the nearest preset. */
export function findBackgroundMovementPreset(value: string | number | null | undefined): BackgroundMovementPreset | null {
  if (value === null || value === undefined || value === '') return null
  const candidate = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(candidate)
    ? BACKGROUND_MOVEMENT_PRESETS.find(preset => preset.value === candidate) ?? null
    : null
}

export function hasCustomBackgroundMultiplier(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined || value === '') return false
  const candidate = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(candidate) && candidate >= 1 && candidate <= 1.6 &&
    findBackgroundMovementPreset(candidate) === null
}
