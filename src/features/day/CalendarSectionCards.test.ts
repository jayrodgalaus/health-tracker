import { describe, expect, it } from 'vitest'
import type { DailySummary } from '../../domain/evaluation'
import { DAY_SECTIONS, energyDifferenceSubtitle, isDaySection } from './CalendarSectionCards'

describe('Calendar section navigation and estimate subtitles', () => {
  it('has exactly five supported subpages and rejects malformed route names', () => {
    expect(DAY_SECTIONS).toEqual(['energy', 'nutrition', 'fluids', 'activity', 'weight'])
    for (const value of DAY_SECTIONS) expect(isDaySection(value)).toBe(true)
    expect(isDaySection('nutrients')).toBe(false)
    expect(isDaySection('unknown')).toBe(false)
    expect(isDaySection(undefined)).toBe(false)
  })

  it('shows an honest estimated difference without rounding stored results', () => {
    const summary = (differenceKcal: number | null) => ({
      expenditure: { differenceKcal }
    }) as DailySummary
    expect(energyDifferenceSubtitle(summary(-320.266))).toBe('Est. difference: ≈ −320.3 kcal')
    expect(energyDifferenceSubtitle(summary(205.49))).toBe('Est. difference: ≈ +205.5 kcal')
    expect(energyDifferenceSubtitle(summary(0))).toBe('Est. difference: ≈ 0 kcal')
    expect(energyDifferenceSubtitle(summary(null))).toBe('Est. difference unavailable')
    expect(energyDifferenceSubtitle()).toBe('Est. difference unavailable')
  })
})
