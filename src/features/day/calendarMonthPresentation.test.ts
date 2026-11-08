import { describe, expect, it } from 'vitest'
import { calendarStatusFill } from './calendarMonthPresentation'
import type { EvaluationStatus } from '../../domain/evaluation'

describe('Calendar day circle colors', () => {
  it('uses pale existing evaluation colors for completed dates only', () => {
    const expected: Record<EvaluationStatus, string> = {
      onTarget: 'bg-emerald-100',
      mixed: 'bg-amber-100',
      offTarget: 'bg-rose-100',
      incomplete: 'bg-slate-200'
    }
    for (const status of Object.keys(expected) as EvaluationStatus[]) {
      expect(calendarStatusFill(status, true)).toContain(expected[status])
    }
  })

  it('shows no assessment background for any uncompleted or unlogged date', () => {
    for (const status of ['onTarget', 'mixed', 'offTarget', 'incomplete'] as EvaluationStatus[]) {
      const css = calendarStatusFill(status, false)
      expect(css).toContain('bg-transparent')
      const baseClasses = css.split(' ').filter(value => !value.startsWith('hover:')).join(' ')
      expect(baseClasses).not.toMatch(/bg-(emerald|amber|rose|slate)-[12]00/)
    }
  })
})
