import { describe, expect, it } from 'vitest'
import { metForPace, paceGradeNetKcal, speedForEstimate } from './paceGrade'

describe('walking/running pace and uphill grade (net above-rest kcal)', () => {
  it('compares walking pace at a fixed distance instead of treating intensity labels as calories', () => {
    expect(metForPace('Walking', 5)).toBe(3.8)
    expect(metForPace('Walking', 6)).toBe(4.8)
    expect(paceGradeNetKcal('Walking', 70, 5, null, 5, 0)).toBeCloseTo(205.8)
    expect(paceGradeNetKcal('Walking', 70, 5, null, 6, 0)).toBeCloseTo(232.75)
    expect(paceGradeNetKcal('Walking', 70, 5, null, 5, 5)).toBeCloseTo(363.3)
  })
  it('uses speed derived from measured distance/duration unless an explicit speed overrides for energy', () => {
    expect(speedForEstimate('Walking', 5, 60, null)).toBe(5)
    expect(speedForEstimate('Walking', 5, 60, 6)).toBe(6)
    expect(paceGradeNetKcal('Walking', 70, 5, 60, null, null)).toBeCloseTo(205.8)
    expect(paceGradeNetKcal('Walking', 70, 5, 60, 6, null)).toBeCloseTo(232.75)
    expect(paceGradeNetKcal('Walking', 70, null, 30, 5, 0)).toBeCloseTo(102.9)
    expect(paceGradeNetKcal('Walking', 70, null, 30, 6, 0)).toBeCloseTo(139.65)
  })
  it('uses running speed and grade without double-counting time and distance', () => {
    expect(metForPace('Running', 10)).toBe(9.3)
    expect(paceGradeNetKcal('Running', 70, 5, 30, null, 0)).toBeCloseTo(305.025)
    expect(paceGradeNetKcal('Running', 70, 5, 30, null, 5)).toBeCloseTo(383.775)
    expect(paceGradeNetKcal('Running', 70, 5, 50, 10, 0)).toBeCloseTo(305.025)
  })
  it('keeps unknown and physiologically out-of-model inputs unassessable', () => {
    expect(paceGradeNetKcal('Walking', 70, null, null, 5, 0)).toBeNull()
    expect(paceGradeNetKcal('Walking', 70, 5, null, 12, 0)).toBeNull()
    expect(paceGradeNetKcal('Running', 70, 5, null, 3, 0)).toBeNull()
    expect(paceGradeNetKcal('Running', 70, 5, null, 10, -5)).toBeNull()
    expect(paceGradeNetKcal('Running', 70, 5, null, 10, 20)).toBeNull()
    expect(paceGradeNetKcal('Walking', Number.NaN, 5, null, 5, 0)).toBeNull()
    expect(paceGradeNetKcal('Walking', 70, 5, 0, 5, 0)).toBeNull()
    expect(paceGradeNetKcal('Walking', 70, 5, 30, null, 0)).toBeNull() // 10 km/h derived walking speed is outside model
  })
})
