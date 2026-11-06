import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_MOVEMENT_PRESETS, findBackgroundMovementPreset, hasCustomBackgroundMultiplier
} from './backgroundMovement'

describe('optional everyday movement presets', () => {
  it('offers understandable, bounded selections without auto-choosing one', () => {
    expect(BACKGROUND_MOVEMENT_PRESETS.map(preset => preset.value)).toEqual([1, 1.1, 1.2, 1.35, 1.5, 1.6])
    expect(BACKGROUND_MOVEMENT_PRESETS.every(preset => preset.label && preset.range && preset.examples)).toBe(true)
    expect(findBackgroundMovementPreset(null)).toBeNull()
    expect(findBackgroundMovementPreset('')).toBeNull()
    expect(findBackgroundMovementPreset('1.2')?.label).toBe('Light everyday movement')
  })
  it('retains a previously saved non-preset value rather than rounding it', () => {
    expect(hasCustomBackgroundMultiplier(1.27)).toBe(true)
    expect(findBackgroundMovementPreset(1.27)).toBeNull()
    expect(hasCustomBackgroundMultiplier('1.27')).toBe(true)
    expect(hasCustomBackgroundMultiplier(1.2)).toBe(false)
    expect(hasCustomBackgroundMultiplier(null)).toBe(false)
    expect(hasCustomBackgroundMultiplier('')).toBe(false)
    expect(hasCustomBackgroundMultiplier('1.9')).toBe(false)
  })
})
