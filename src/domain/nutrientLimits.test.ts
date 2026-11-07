import { describe, expect, it } from 'vitest'
import type { MetricCoverage } from './nutrition'
import {
  knownAmountPercent, validateNutrientComparisonLimits
} from './nutrientLimits'

const metric = (knownAmount: number | null, unknownEntryCount = 0): MetricCoverage => ({
  knownAmount,
  knownEntryCount: knownAmount === null ? 0 : 1,
  unknownEntryCount,
  totalEntryCount: (knownAmount === null ? 0 : 1) + unknownEntryCount,
  complete: knownAmount !== null && unknownEntryCount === 0
})

describe('optional Calendar sugar/sodium upper limit comparisons', () => {
  it('uses configured limits rather than any inferred dietary percentage', () => {
    expect(knownAmountPercent(metric(22.5), 45)).toBe(50)
    expect(knownAmountPercent(metric(1500), 2000)).toBe(75)
    expect(knownAmountPercent(metric(2200), 2000)).toBe(110)
    expect(knownAmountPercent(metric(0), 45)).toBe(0)
  })
  it('shows the known percentage even when other logs omit that nutrient', () => {
    expect(knownAmountPercent(metric(22.5, 2), 45)).toBe(50)
    expect(knownAmountPercent(metric(2200, 1), 2000)).toBe(110)
    expect(knownAmountPercent(metric(null, 2), 2000)).toBeNull()
  })
  it('does not create percentages without a valid positive limit or a known amount', () => {
    expect(knownAmountPercent(metric(22), null)).toBeNull()
    expect(knownAmountPercent(metric(22), 0)).toBeNull()
    expect(knownAmountPercent(metric(22), Number.NaN)).toBeNull()
    expect(knownAmountPercent(metric(null), 45)).toBeNull()
  })
  it('requires either unset or finite positive limits with explicit units', () => {
    expect(() => validateNutrientComparisonLimits({ sugarsG: null, sodiumMg: null })).not.toThrow()
    expect(() => validateNutrientComparisonLimits({ sugarsG: 45, sodiumMg: 2000 })).not.toThrow()
    expect(() => validateNutrientComparisonLimits({ sugarsG: 0, sodiumMg: 2000 })).toThrow(/Sugar limit/)
    expect(() => validateNutrientComparisonLimits({ sugarsG: Number.NaN, sodiumMg: 2000 })).toThrow(/Sugar limit/)
    expect(() => validateNutrientComparisonLimits({ sugarsG: 45, sodiumMg: -1 })).toThrow(/Sodium limit/)
    expect(() => validateNutrientComparisonLimits({ sugarsG: 45, sodiumMg: Number.POSITIVE_INFINITY })).toThrow(/Sodium limit/)
  })
})
