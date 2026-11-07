import { describe, expect, it } from 'vitest'
import type { DailySummary } from '../../domain/evaluation'
import { DAY_SECTIONS, calendarSectionValue, isDaySection } from './CalendarSectionCards'

function day(overrides: {
  difference?: number | null
  calories?: number | null
  caloriesComplete?: boolean
  fluid?: number | null
  fluidComplete?: boolean
  workout?: number | null
  workoutComplete?: boolean
  weight?: number | null
} = {}): DailySummary {
  return {
    expenditure: { differenceKcal: overrides.difference ?? -844.5 },
    intake: {
      nutrients: {
        energyKcal: {
          knownAmount: overrides.calories === undefined ? 1499.5 : overrides.calories,
          complete: overrides.caloriesComplete ?? true
        }
      },
      fluids: {
        knownAmount: overrides.fluid === undefined ? 1850 : overrides.fluid,
        complete: overrides.fluidComplete ?? true
      }
    },
    activity: {
      knownIncrementalKcal: overrides.workout === undefined ? 305.125 : overrides.workout,
      energyCoverageComplete: overrides.workoutComplete ?? true
    },
    recordedWeightKg: overrides.weight === undefined ? 71.5 : overrides.weight
  } as DailySummary
}

describe('Calendar section navigation and value-only card subtitles', () => {
  it('has exactly five supported subpages and rejects invalid routes', () => {
    expect(DAY_SECTIONS).toEqual(['energy', 'nutrition', 'fluids', 'activity', 'weight'])
    for (const value of DAY_SECTIONS) expect(isDaySection(value)).toBe(true)
    expect(isDaySection('nutrients')).toBe(false)
    expect(isDaySection('unknown')).toBe(false)
    expect(isDaySection(undefined)).toBe(false)
  })

  it('shows recorded totals and estimated differences without descriptive captions', () => {
    const summary = day()
    expect(calendarSectionValue('energy', summary, 'kg')).toBe('≈ −844.5 kcal')
    expect(calendarSectionValue('nutrition', summary, 'kg')).toBe('1,499.5 kcal')
    expect(calendarSectionValue('fluids', summary, 'kg')).toBe('1,850 mL')
    expect(calendarSectionValue('activity', summary, 'kg')).toBe('≈ 305.1 kcal')
    expect(calendarSectionValue('weight', summary, 'kg')).toBe('71.5 kg')
    expect(calendarSectionValue('weight', summary, 'lb')).toBe('157.6 lb')
    expect(calendarSectionValue('energy', day({ difference: 205.49 }), 'kg')).toBe('≈ +205.5 kcal')
    expect(calendarSectionValue('energy', day({ difference: 0 }), 'kg')).toBe('≈ 0 kcal')
  })

  it('does not treat unknown values or unlogged workouts and weight as zero', () => {
    const summary = day({ calories: null, fluid: null, workout: null, weight: null })
    expect(calendarSectionValue('nutrition', summary, 'kg')).toBe('—')
    expect(calendarSectionValue('fluids', summary, 'kg')).toBe('—')
    expect(calendarSectionValue('activity', summary, 'kg')).toBe('—')
    expect(calendarSectionValue('weight', summary, 'kg')).toBe('No record')
    expect(calendarSectionValue('energy', day({ difference: null }), 'kg')).toBe('—')
    expect(calendarSectionValue('activity', undefined, 'kg')).toBe('—')
    expect(calendarSectionValue('weight', undefined, 'kg')).toBe('No record')
  })

  it('retains actual zeroes and identifies partial known totals as minimums', () => {
    const summary = day({
      calories: 0, caloriesComplete: true,
      fluid: 1200.6, fluidComplete: false,
      workout: 210.125, workoutComplete: false
    })
    expect(calendarSectionValue('nutrition', summary, 'kg')).toBe('0 kcal')
    expect(calendarSectionValue('fluids', summary, 'kg')).toBe('≥1,200.6 mL')
    expect(calendarSectionValue('activity', summary, 'kg')).toBe('≥210.1 kcal')
  })
})
