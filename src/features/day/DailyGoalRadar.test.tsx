import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DailySummary, RuleResult } from '../../domain/evaluation'
import { DailyGoalRadar } from './DailyGoalRadar'

function rule(code: string, actual: number | null): RuleResult {
  return {
    code: code + (actual === null ? '.notEvaluated' : '.pass'), label: code,
    actual, target: 100, unit: 'g',
    state: actual === null ? 'notEvaluated' : 'pass',
    source: 'recorded', explanation: ''
  }
}

function day(withMissing = false): DailySummary {
  return {
    evaluation: {
      isComplete: false,
      results: [
        rule('energyKcal', 100),
        rule('proteinG', withMissing ? null : 80),
        rule('fiberG', 60)
      ]
    },
    intake: {
      nutrients: {
        energyKcal: { unknownEntryCount: 0 },
        proteinG: { unknownEntryCount: withMissing ? 1 : 0 },
        fiberG: { unknownEntryCount: 0 }
      }
    }
  } as DailySummary
}

describe('Daily goal radar animation rendering', () => {
  it('initially connects all nodes at the chart center with a mounted, filled polygon', () => {
    const html = renderToStaticMarkup(<DailyGoalRadar summary={day()} />)
    expect(html).toContain('data-radar-animation="playing"')
    expect(html).toContain('data-radar-shape="complete"')
    expect(html).toContain('points="160.00,150.00 160.00,150.00 160.00,150.00"')
    expect(html).toContain('fill="rgba(255,255,255,0.18)" stroke="#ffffff"')
    expect(html).toContain('data-radar-point="energyKcal" cx="160" cy="150"')
    expect(html).toContain('data-radar-point="proteinG" cx="160" cy="150"')
    expect(html).toContain('data-radar-point="fiberG" cx="160" cy="150"')
    expect(html).toContain('Goal chart values: Calories: 100%')
  })

  it('does not create a vertex or filled polygon for unknown goals', () => {
    const html = renderToStaticMarkup(<DailyGoalRadar summary={day(true)} />)
    expect(html).not.toContain('data-radar-shape="complete"')
    expect(html).not.toContain('data-radar-point="proteinG"')
    expect(html).toContain('data-radar-point="energyKcal"')
    expect(html).toContain('Protein: unavailable')
  })
})
