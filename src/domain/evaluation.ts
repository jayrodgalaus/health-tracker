import type { DayReview, DailyTargets, EvaluationRuleSettings, ExerciseEntry, FoodEntry, GoalPeriod, LocalDay, Profile, WeightEntry } from './models'
import { aggregateIntake, isPlainWaterEntry, type IntakeSummary, type MetricCoverage } from './nutrition'
import { calculateActivityDay, type ActivityDaySummary } from './activity'
import { ageOnDay } from './profile'
import { calculateExpenditure, type ExpenditureSummary } from './expenditure'

export const EVALUATION_RULE_VERSION = '1.0.0'
export type EvaluationStatus = 'onTarget' | 'mixed' | 'offTarget' | 'incomplete'
export type RuleState = 'pass' | 'attention' | 'significantDeviation' | 'notEvaluated'

export interface RuleResult {
  code: string
  state: RuleState
  label: string
  explanation: string
  actual: number | null
  target: number | null
  unit: string
  source: 'recorded' | 'userTarget'
}
export interface DayEvaluation {
  status: EvaluationStatus
  isComplete: boolean
  isAssessable: boolean
  assessedRuleCount: number
  expectedRuleCount: number
  results: RuleResult[]
  keyObservations: string[]
  calculatedAt: string
  evaluationRuleVersion: string
  ruleSettings: EvaluationRuleSettings
}
export interface DayCalculationContext {
  dayKey: LocalDay
  profile: Profile
  goal: GoalPeriod | null
  weights: readonly WeightEntry[]
  intake: readonly FoodEntry[]
  activities: readonly ExerciseEntry[]
  review: DayReview | null
}
export interface DailySummary {
  dayKey: LocalDay
  intake: IntakeSummary
  activity: ActivityDaySummary
  expenditure: ExpenditureSummary
  evaluation: DayEvaluation
  recordedWeightKg: number | null
  entryCount: number
}

/** Centralized *product alignment* heuristics, not medical cutoffs. */
export const ALIGNMENT_RULES: EvaluationRuleSettings = {
  energyAlignedPercent: 15,
  energyAttentionPercent: 30,
  minimumLargeDeviationPercent: 50,
  sodiumLargeDeviationPercent: 30
}

type GoalMetric = keyof Pick<DailyTargets, 'energyKcal' | 'proteinG' | 'fiberG' | 'fluidMl' | 'sodiumMg'>
const dailyChecks: { key: GoalMetric; label: string; unit: string; direction: 'range' | 'minimum' | 'maximum' }[] = [
  { key: 'energyKcal', label: 'Calories consumed', unit: 'kcal', direction: 'range' },
  { key: 'proteinG', label: 'Protein', unit: 'g', direction: 'minimum' },
  { key: 'fiberG', label: 'Fiber', unit: 'g', direction: 'minimum' },
  { key: 'fluidMl', label: 'Logged fluid', unit: 'ml', direction: 'minimum' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg', direction: 'maximum' }
]

function metricFor(key: GoalMetric, intake: IntakeSummary): MetricCoverage {
  return key === 'fluidMl' ? intake.fluids : intake.nutrients[key]
}

function ruleFor(check: (typeof dailyChecks)[number], target: number, metric: MetricCoverage, enoughEntries: boolean, rules: EvaluationRuleSettings): RuleResult {
  const actual = metric.knownAmount
  const common = {
    label: check.label, actual, target, unit: check.unit,
    source: 'recorded' as const
  }
  if (!enoughEntries || !metric.complete || actual === null || !Number.isFinite(actual)) {
    return {
      ...common, code: check.key + '.notEvaluated', state: 'notEvaluated',
      explanation: !enoughEntries ? 'No relevant recorded entry establishes this daily metric.'
        : 'Known for ' + metric.knownEntryCount + '/' + metric.totalEntryCount + ' relevant entries. Missing label or volume values are not zero; this target cannot be assessed.'
    }
  }
  let state: RuleState
  let difference: number
  if (check.direction === 'range') {
    difference = Math.abs(actual - target) / target * 100
    state = difference <= rules.energyAlignedPercent ? 'pass' :
      difference <= rules.energyAttentionPercent ? 'attention' : 'significantDeviation'
  } else if (check.direction === 'maximum') {
    difference = target === 0 ? (actual === 0 ? 0 : Infinity) : (actual - target) / target * 100
    state = actual <= target ? 'pass' :
      difference <= rules.sodiumLargeDeviationPercent ? 'attention' : 'significantDeviation'
  } else {
    difference = target === 0 ? 100 : actual / target * 100
    state = actual >= target ? 'pass' :
      difference >= rules.minimumLargeDeviationPercent ? 'attention' : 'significantDeviation'
  }
  const description = check.direction === 'range' ? 'compared within ±' + rules.energyAlignedPercent + '% / ±' + rules.energyAttentionPercent + '% bands of'
    : check.direction === 'maximum' ? 'compared as a user-selected upper tracking limit against'
      : 'compared as a user-selected minimum tracking goal (' + rules.minimumLargeDeviationPercent + '% severe-deviation threshold) against'
  return {
    ...common, code: check.key + '.' + state, state,
    explanation: check.label + ': recorded ' + Number(actual.toFixed(2)) + ' ' + check.unit +
      ', user target ' + target + ' ' + check.unit + '. Value ' + description +
      ' the target. These are versioned tracking rules, not medical or nutritional requirements.'
  }
}

/** Pure: the UI supplies calculatedAt; never reads Date.now or IndexedDB. */
export function evaluateDay(context: DayCalculationContext, intake: IntakeSummary, calculatedAt: string): DayEvaluation {
  const complete = context.review?.isComplete === true
  const age = ageOnDay({
    birthDate: context.profile.birthDate, ageYears: context.profile.ageYears ?? null, ageAsOf: context.profile.ageAsOf ?? null
  }, context.dayKey)
  const adult = age !== null && age >= 18
  const targets = context.goal?.targets
  const ruleSettings: EvaluationRuleSettings = { ...ALIGNMENT_RULES, ...(context.goal?.ruleSettings ?? {}) }
  // Never surface even provisional adult-oriented goal judgments for minors or unknown adult age.
  const results = adult && targets ? dailyChecks.flatMap(check => {
    const target = targets[check.key]
    if (target === null || target === undefined || !Number.isFinite(target) || target < 0 ||
      (check.direction === 'range' && target === 0)) return []
    const relevant = check.key === 'energyKcal' ?
      context.intake.some(entry => entry.dayKey === context.dayKey && !isPlainWaterEntry(entry)) :
        check.key === 'fluidMl' ? context.intake.some(entry => entry.dayKey === context.dayKey && entry.kind === 'beverage') :
          context.intake.some(entry => entry.dayKey === context.dayKey && !isPlainWaterEntry(entry))
    return [ruleFor(check, target, metricFor(check.key, intake), relevant, ruleSettings)]
  }) : []
  const assessed = results.filter(rule => rule.state !== 'notEvaluated')
  const isAssessable = complete && adult && results.length > 0 && assessed.length === results.length
  const status: EvaluationStatus = !isAssessable ? 'incomplete' :
    results.some(rule => rule.state === 'significantDeviation') ? 'offTarget' :
      results.some(rule => rule.state === 'attention') ? 'mixed' : 'onTarget'
  const keyObservations: string[] = []
  if (!complete) keyObservations.push('This day is not marked complete, so the calendar does not evaluate its goal alignment.')
  else if (!adult) keyObservations.push('Adult-oriented goal evaluation is unavailable for this date; basic logging remains visible.')
  else if (!results.length) keyObservations.push('No supported daily tracking target is configured for this date.')
  else if (!isAssessable) keyObservations.push('Some selected targets lack complete logged data; the overall day stays unassessed.')
  if (isAssessable) {
    const deviating = results.filter(rule => rule.state !== 'pass')
    if (!deviating.length) keyObservations.push('Recorded values align with the selected, assessable tracking targets.')
    else keyObservations.push(...deviating.slice(0, 3).map(rule => rule.label + ' differs from your selected tracking target; see the rule details.'))
  }
  // Neutral, descriptive observation is always safe and never invents meals.
  if (keyObservations.length < 3) keyObservations.push(
    context.intake.length + ' intake entries recorded; calorie data known for ' +
    intake.nutrients.energyKcal.knownEntryCount + '/' + intake.nutrients.energyKcal.totalEntryCount + '.'
  )
  return {
    status, isComplete: complete, isAssessable, assessedRuleCount: assessed.length,
    expectedRuleCount: results.length, results, keyObservations: keyObservations.slice(0, 3),
    calculatedAt, evaluationRuleVersion: EVALUATION_RULE_VERSION, ruleSettings
  }
}

export function calculateDay(context: DayCalculationContext, calculatedAt: string): DailySummary {
  // Frozen completions are historical records, not live recalculations.
  if (context.review?.isComplete && context.review.frozen?.version === 1) return context.review.frozen.summary
  const food = context.intake.filter(entry => entry.dayKey === context.dayKey)
  const activities = context.activities.filter(entry => entry.dayKey === context.dayKey)
  const intake = aggregateIntake(food)
  const age = ageOnDay({
    birthDate: context.profile.birthDate, ageYears: context.profile.ageYears ?? null, ageAsOf: context.profile.ageAsOf ?? null
  }, context.dayKey)
  const activity = calculateActivityDay(context.dayKey, activities, context.weights, age !== null && age >= 18)
  const expenditure = calculateExpenditure(context.dayKey, context.profile, context.weights, activities, food, context.review)
  const recorded = context.weights.filter(weight => weight.dayKey === context.dayKey)
  return {
    dayKey: context.dayKey, intake, activity, expenditure,
    evaluation: evaluateDay({ ...context, intake: food, activities }, intake, calculatedAt),
    recordedWeightKg: recorded.length === 1 ? recorded[0]?.weightKg ?? null : null,
    entryCount: food.length + activities.length + recorded.length
  }
}

/** Deterministic effective-dated goal; no future target can score a previous month. */
export function goalOnDay(day: LocalDay, goals: readonly GoalPeriod[]): GoalPeriod | null {
  return goals.filter(goal => goal.effectiveFrom <= day).reduce<GoalPeriod | null>(
    (latest, goal) => !latest || goal.effectiveFrom > latest.effectiveFrom ? goal : latest, null
  )
}
