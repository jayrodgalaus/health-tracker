import type { DailySummary, RuleResult } from './evaluation'

export type RadarGoal = {
  code: string
  label: string
  score: number | null
  /** A numeric lower-bound plot, never a completed day evaluation. */
  provisional: boolean
  /** Input to the goal, not a percentage of data assumed to be missing. */
  actual: number | null
  target: number | null
}

const labels: Record<string, string> = {
  energyKcal: 'Calories',
  proteinG: 'Protein',
  fiberG: 'Fiber',
  fluidMl: 'Fluids',
  sodiumMg: 'Sodium'
}
const minimums = new Set(['proteinG', 'fiberG', 'fluidMl'])
const clamp = (value: number) => Math.min(100, Math.max(0, value))

/** Display-only alignment: separate from versioned Calendar evaluation and status. */
export function radarScore(rule: RuleResult): number | null {
  const metric = rule.code.split('.')[0] ?? ''
  const { actual, target } = rule
  // Partially known values can be displayed provisionally, but the day remains
  // unassessed. Completely missing metrics have no plotted vertex.
  if (actual === null || target === null ||
      !Number.isFinite(actual) || !Number.isFinite(target) ||
      actual < 0 || target < 0) return null
  if (metric === 'energyKcal') {
    if (target === 0) return null
    // One chart point lost for each percentage point either side of target.
    return clamp(100 - 100 * Math.abs(actual - target) / target)
  }
  if (metric === 'sodiumMg') {
    if (target === 0) return actual === 0 ? 100 : 0
    // At/below limit is full score; each 1% excess loses TEN points.
    return clamp(100 - 1000 * Math.max(0, actual - target) / target)
  }
  if (minimums.has(metric)) {
    return target === 0 ? 100 : clamp(100 * actual / target)
  }
  return null
}

/** Follow configured rule order; do not create vertices for unset goals. */
export function alignmentRadar(summary: DailySummary): RadarGoal[] {
  return summary.evaluation.results.map(rule => {
    const code = rule.code.split('.')[0] ?? ''
    return {
      code,
      label: labels[code] ?? rule.label,
      score: radarScore(rule),
      provisional: rule.state === 'notEvaluated' && rule.actual !== null,
      actual: rule.actual,
      target: rule.target
    }
  })
}
