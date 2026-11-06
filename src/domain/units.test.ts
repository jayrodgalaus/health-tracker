import { describe, expect, it } from 'vitest'
import { centimetersFromInches, displayNumber, fluidFrom, fluidTo, inchesFromCentimeters, kilogramsFrom, kilogramsTo } from './units'

describe('canonical unit conversions', () => {
  it('round trips weight without persistence drift', () => {
    const kg = 70.125
    expect(kilogramsFrom(kilogramsTo(kg, 'lb'), 'lb')).toBeCloseTo(kg, 10)
  })
  it('converts height consistently', () => {
    expect(centimetersFromInches(72)).toBeCloseTo(182.88)
    expect(inchesFromCentimeters(centimetersFromInches(72))).toBeCloseTo(72)
  })
  it('preserves fluid quantity across unit conversions', () => {
    expect(fluidFrom(fluidTo(500, 'fl-oz'), 'fl-oz')).toBeCloseTo(500)
  })
  it('rounds only the displayed value', () => {
    expect(displayNumber(70.04)).toBe('70')
    expect(displayNumber(70.15, 2)).toBe('70.15')
  })
})
