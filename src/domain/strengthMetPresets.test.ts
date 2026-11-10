import { describe, expect, it } from 'vitest'
import { STRENGTH_MET_PRESETS, strengthMetPresetForValue } from './strengthMetPresets'
import { netMetKcal } from './activity'

describe('2024 Compendium strength-training MET presets', () => {
  it('keeps sourced workout labels, codes and MET values in the allowed range', () => {
    expect(STRENGTH_MET_PRESETS.map(({ code, met }) => [code, met])).toEqual([
      ['02056', 3], ['02054', 3.5], ['02052', 5], ['02055', 5.8],
      ['02050', 6], ['02057', 6.5], ['02058', 9.8]
    ])
    expect(new Set(STRENGTH_MET_PRESETS.map(preset => preset.code)).size).toBe(STRENGTH_MET_PRESETS.length)
    expect(STRENGTH_MET_PRESETS.every(preset => preset.met >= 1 && preset.met <= 25)).toBe(true)
  })

  it('recognizes historical numeric presets without changing custom values', () => {
    expect(strengthMetPresetForValue(3.5)?.code).toBe('02054')
    expect(strengthMetPresetForValue(9.8)?.label).toBe('Kettlebell swings')
    expect(strengthMetPresetForValue(4.25)).toBeUndefined()
    expect(strengthMetPresetForValue(null)).toBeUndefined()
  })

  it('uses the existing net-above-rest MET formula, not gross calories', () => {
    expect(netMetKcal(STRENGTH_MET_PRESETS[1]!.met, 70, 30)).toBeCloseTo(91.875)
    expect(netMetKcal(STRENGTH_MET_PRESETS[6]!.met, 70, 30)).toBeCloseTo(323.4)
  })
})
