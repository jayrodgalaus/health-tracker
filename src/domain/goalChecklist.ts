import type { DailySummary, RuleResult, RuleState } from './evaluation'

export interface GoalChecklistItem {
  code: string
  label: string
  comparison: string
  status: RuleState
  statusLabel: string
}

const metricLabels: Record<string, string> = {
  energyKcal: 'Calories',
  proteinG: 'Protein',
  fiberG: 'Fiber',
  fluidMl: 'Fluid',
  sodiumMg: 'Sodium'
}

const ruleStatusLabels: Record<RuleState, string> = {
  pass: 'Aligned',
  attention: 'Needs attention',
  significantDeviation: 'Significant deviation',
  notEvaluated: 'Not evaluated'
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

function amount(value: number | null, unit: string, partial = false): string {
  if (value === null) return '—'
  return (partial ? '≥' : '') + numberFormat.format(value) + ' ' + unit
}

/** Text-only presentation of the same versioned rule results used by Calendar. */
export function checklistItem(result: RuleResult, summary: DailySummary): GoalChecklistItem {
  const key = result.code.split('.')[0] ?? ''
  const status: RuleState = summary.evaluation.isComplete ? result.state : 'notEvaluated'
  const coverage = key === 'fluidMl' ? summary.intake.fluids
    : key === 'energyKcal' || key === 'proteinG' || key === 'fiberG' || key === 'sodiumMg'
      ? summary.intake.nutrients[key] : null
  const partial = result.actual !== null && coverage !== null && coverage.unknownEntryCount > 0
  return {
    code: result.code,
    label: metricLabels[key] ?? result.label,
    comparison: amount(result.actual, result.unit, partial) + ' / ' + amount(result.target, result.unit),
    status,
    statusLabel: ruleStatusLabels[status]
  }
}

export function goalChecklist(summary: DailySummary): GoalChecklistItem[] {
  return summary.evaluation.results.map(result => checklistItem(result, summary))
}
