import { describe, expect, it } from 'vitest'
import type { DailySummary, RuleResult, RuleState } from './evaluation'
import { checklistItem, goalChecklist } from './goalChecklist'

const result = (code: string, state: RuleState, actual: number | null, target: number,
  unit: string, label: string): RuleResult => ({
  code, state, actual, target, unit, label, explanation: 'Synthetic test rule', source: 'recorded'
})

function summary(isComplete: boolean, results: RuleResult[], missingSodium = false): DailySummary {
  // The formatter only uses evaluation results/completion and per-metric coverage.
  return {
    evaluation: { isComplete, results },
    intake: {
      nutrients: {
        energyKcal: { unknownEntryCount: 0 },
        proteinG: { unknownEntryCount: 0 },
        fiberG: { unknownEntryCount: 0 },
        sodiumMg: { unknownEntryCount: missingSodium ? 1 : 0 }
      },
      fluids: { unknownEntryCount: 0 }
    }
  } as DailySummary
}

describe('Calendar daily-goal checklist', () => {
  it('displays aligned calories and sodium with clean decimal rounding and a single-line ratio', () => {
    const rows = goalChecklist(summary(true, [
      result('energyKcal.pass', 'pass', 1499.499999999998, 1600, 'kcal', 'Calories consumed'),
      result('sodiumMg.pass', 'pass', 1905.3, 2000, 'mg', 'Sodium')
    ]))
    expect(rows[0]).toMatchObject({
      label: 'Calories', icon: '✅', statusLabel: 'Aligned',
      comparison: '1,499.5 kcal / 1,600 kcal'
    })
    expect(rows[1]).toMatchObject({
      label: 'Sodium', icon: '✅', comparison: '1,905.3 mg / 2,000 mg'
    })
  })

  it('shows fluid attention and significant-deviation states without judgement labels', () => {
    const rows = goalChecklist(summary(true, [
      result('fluidMl.attention', 'attention', 1850, 2300, 'ml', 'Logged fluid'),
      result('proteinG.significantDeviation', 'significantDeviation', 10, 100, 'g', 'Protein')
    ]))
    expect(rows[0]).toMatchObject({
      label: 'Fluid', icon: '⚠️', statusLabel: 'Needs attention',
      comparison: '1,850 ml / 2,300 ml'
    })
    expect(rows[1]).toMatchObject({
      label: 'Protein', icon: '❌', statusLabel: 'Significant deviation'
    })
  })

  it('uses a neutral dash when a goal is unassessable and a lower bound for partially known intake', () => {
    const partial = checklistItem(result('sodiumMg.notEvaluated', 'notEvaluated',
      1905.3, 2000, 'mg', 'Sodium'), summary(true, [], true))
    expect(partial).toMatchObject({
      icon: '➖', statusLabel: 'Not evaluated',
      comparison: '≥1,905.3 mg / 2,000 mg'
    })
    const missing = checklistItem(result('sodiumMg.notEvaluated', 'notEvaluated',
      null, 2000, 'mg', 'Sodium'), summary(true, []))
    expect(missing.comparison).toBe('— / 2,000 mg')
  })

  it('does not visually score a day that has not been marked complete', () => {
    const provisional = checklistItem(
      result('energyKcal.pass', 'pass', 1600, 1600, 'kcal', 'Calories consumed'),
      summary(false, []))
    expect(provisional).toMatchObject({
      icon: '➖', statusLabel: 'Not evaluated',
      comparison: '1,600 kcal / 1,600 kcal'
    })
    expect(goalChecklist(summary(true, []))).toEqual([])
  })
})
