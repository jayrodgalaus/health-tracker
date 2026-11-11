import { describe, expect, it } from 'vitest'
import { RADAR_ANIMATION_MS, animatedRadarFraction } from './radarMotion'

describe('clockwise radar node intro', () => {
  it('starts every assessable node at the radial origin, then settles at 500ms', () => {
    for (let i = 0; i < 5; i++) {
      expect(animatedRadarFraction(80, i, 5, 0)).toBe(0)
      expect(animatedRadarFraction(80, i, 5, RADAR_ANIMATION_MS)).toBeCloseTo(0.8)
    }
  })
  it('staggered progress starts at the top and advances clockwise', () => {
    const fractions = Array.from({ length: 5 }, (_, index) =>
      animatedRadarFraction(100, index, 5, 100)!)
    expect(fractions[0]).toBeGreaterThan(fractions[1]!)
    expect(fractions[1]).toBeGreaterThan(0)
    expect(fractions.slice(2)).toEqual([0, 0, 0])
    expect(animatedRadarFraction(100, 4, 5, 300)).toBe(0)
    expect(animatedRadarFraction(100, 4, 5, 400)).toBeGreaterThan(0)
    expect(animatedRadarFraction(100, 4, 5, 500)).toBe(1)
  })
  it('keeps lines changing as individual vertices travel and uses easing', () => {
    const first = animatedRadarFraction(100, 0, 5, 50)!
    const next = animatedRadarFraction(100, 1, 5, 50)!
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(1)
    expect(next).toBe(0)
    expect(animatedRadarFraction(100, 0, 5, 100)).toBeGreaterThan(first)
    expect(animatedRadarFraction(100, 0, 5, 200)).toBe(1)
  })
  it('retains real zeros and does not fabricate missing scores', () => {
    expect(animatedRadarFraction(null, 2, 5, 500)).toBeNull()
    expect(animatedRadarFraction(0, 3, 5, 500)).toBe(0)
    expect(animatedRadarFraction(150, 0, 5, 500)).toBe(1)
    expect(animatedRadarFraction(-5, 0, 5, 500)).toBe(0)
    expect(animatedRadarFraction(60, 0, 1, 250)).toBeGreaterThan(0)
    expect(animatedRadarFraction(60, 0, 1, 500)).toBeCloseTo(0.6)
  })
})
