import { describe, expect, it } from 'vitest'
import { ENERGY_GOAL_BANDS, energyGaugeResult } from './energyGauge'

describe('energy difference gauge comparison', () => {
  it.each([
    ['maintain', 0, 'aligned'], ['maintain', -100, 'aligned'],
    ['maintain', 100, 'aligned'], ['maintain', -101, 'outside'],
    ['lose', -50, 'aligned'], ['lose', -150, 'aligned'],
    ['lose', 0, 'outside'], ['lose', -300, 'outside'],
    ['gain', 50, 'aligned'], ['gain', 150, 'aligned'],
    ['gain', -50, 'outside'], ['gain', 160, 'outside'],
    ['general-wellness', -150, 'aligned'],
    ['general-wellness', 150, 'aligned'], ['general-wellness', 200, 'outside']
  ] as const)('%s, difference %s is %s', (goal, difference, state) => {
    expect(energyGaugeResult(1000 + difference, 1000, difference, goal, true, true).state).toBe(state)
  })

  it('documents explicit bands for every supported profile goal', () => {
    expect(ENERGY_GOAL_BANDS).toEqual({
      maintain: { min: -.1, max: .1 },
      lose: { min: -.15, max: -.05 },
      gain: { min: .05, max: .15 },
      'general-wellness': { min: -.15, max: .15 }
    })
  })

  it('is neutral on incomplete or unassessable days', () => {
    expect(energyGaugeResult(800, 1000, -200, 'lose', false, true)).toEqual({
      state: 'unassessed', fill: 0.8, differenceRatio: null
    })
    expect(energyGaugeResult(800, 1000, -200, null, true, true).state).toBe('unassessed')
    expect(energyGaugeResult(800, 1000, -200, 'lose', true, false).state).toBe('unassessed')
    expect(energyGaugeResult(800, 1000, null, 'lose', true, true).state).toBe('unassessed')
    expect(energyGaugeResult(null, 1000, null, 'maintain', true, false).fill).toBe(0)
    expect(energyGaugeResult(0, 0, 0, 'maintain', true, true).state).toBe('unassessed')
  })

  it('caps the arc when consumed exceeds expended without losing the signed difference', () => {
    expect(energyGaugeResult(1600, 1000, 600, 'gain', true, true)).toEqual({
      state: 'outside', fill: 1, differenceRatio: 0.6
    })
  })
})
