import { describe, expect, it } from 'vitest'
import { ageOnDay, assertWeight, EMPTY_TARGETS, validateGoal, validateProfile, type ProfileValues } from './profile'

const base: ProfileValues = {
  birthDate: '2000-11-10', ageYears: null, ageAsOf: null, heightCm: 170,
  sexForEquation: null, activityLevel: null, goal: 'general-wellness',
  units: { mass: 'kg', height: 'cm', fluid: 'ml' }
}

describe('profile and goal validation', () => {
  it('updates birth-date age on the right calendar day', () => {
    expect(ageOnDay(base, '2026-11-09')).toBe(25)
    expect(ageOnDay(base, '2026-11-10')).toBe(26)
  })
  it('accepts a dated age alternative and does not invent an undated age', () => {
    expect(ageOnDay({ birthDate: null, ageYears: 30, ageAsOf: '2025-05-01' }, '2026-04-30')).toBe(30)
    expect(ageOnDay({ birthDate: null, ageYears: 30, ageAsOf: '2025-05-01' }, '2026-05-01')).toBe(31)
    expect(ageOnDay({ birthDate: null, ageYears: null, ageAsOf: null }, '2026-05-01')).toBeNull()
  })
  it('rejects missing birth data, invalid numbers, impossible future DOB', () => {
    expect(() => validateProfile({ ...base, birthDate: null }, '2026-11-06')).toThrow()
    expect(() => validateProfile({ ...base, heightCm: Infinity }, '2026-11-06')).toThrow()
    expect(() => validateProfile({ ...base, birthDate: '2028-01-01' }, '2026-11-06')).toThrow()
    expect(() => assertWeight(NaN)).toThrow()
    expect(() => assertWeight(-1)).toThrow()
  })
  it('allows simple tracking for minors but not adult equations (later phase)', () => {
    expect(() => validateProfile({ ...base, birthDate: '2014-03-01' }, '2026-11-06')).not.toThrow()
    expect(ageOnDay({ ...base, birthDate: '2014-03-01' }, '2026-11-06')).toBe(12)
  })
  it('rejects target backdating and nonfinite numeric targets', () => {
    const goals = { effectiveFrom: '2026-11-06', goalType: 'maintain' as const, targetWeightKg: null, targets: EMPTY_TARGETS }
    expect(() => validateGoal({ ...goals, effectiveFrom: '2026-10-01' }, '2026-11-06', true)).toThrow()
    expect(() => validateGoal({ ...goals, targets: { ...EMPTY_TARGETS, energyKcal: Infinity } }, '2026-11-06', false)).toThrow()
    expect(() => validateGoal(goals, '2026-11-06', false)).not.toThrow()
  })
})
