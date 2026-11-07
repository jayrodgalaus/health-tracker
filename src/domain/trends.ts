import type { ExerciseEntry, FoodEntry, GoalPeriod, LocalDay, Profile, WeightEntry, DayReview } from './models'
import { calculateDay, goalOnDay, type EvaluationStatus } from './evaluation'
import { calculateActivityWeek, weekBounds } from './activity'
import { addLocalDays } from './calendar'
import { assertLocalDay } from './profile'

export type TrendMetric =
  | 'intakeKcal' | 'expenditureKcal' | 'differenceKcal' | 'weightKg'
  | 'proteinG' | 'carbohydratesG' | 'fatG' | 'fiberG' | 'fluidMl'
export const TREND_METRICS: { key: TrendMetric; label: string; unit: string }[] = [
  { key: 'intakeKcal', label: 'Calories consumed', unit: 'kcal' },
  { key: 'expenditureKcal', label: 'Estimated total expended', unit: 'kcal' },
  { key: 'differenceKcal', label: 'Estimated difference (consumed − expended)', unit: 'kcal' },
  { key: 'weightKg', label: 'Actual measured weight', unit: 'kg' },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'carbohydratesG', label: 'Carbohydrates', unit: 'g' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
  { key: 'fiberG', label: 'Fiber', unit: 'g' },
  { key: 'fluidMl', label: 'Logged fluid', unit: 'ml' }
]
export interface TrendValue { value: number | null; partial: boolean }
export type TrendDay = { day: LocalDay; status: EvaluationStatus; isAssessable: boolean; entries: number } &
  Record<TrendMetric, TrendValue>

export interface TrendSources {
  intake: readonly FoodEntry[]
  activities: readonly ExerciseEntry[]
  weights: readonly WeightEntry[]
  goals: readonly GoalPeriod[]
  reviews: readonly DayReview[]
}

export interface WeekTrend {
  start: LocalDay
  end: LocalDay
  loggedMinutes: number | null
  missingDurationEntries: number
  lightMinutes: number | null
  moderateMinutes: number | null
  vigorousMinutes: number | null
  unclassifiedMinutes: number | null
  strengthDays: number | null
}

export interface AdherenceSummary {
  onTarget: number
  mixed: number
  offTarget: number
  incomplete: number
  assessable: number
  /** Null when there are no completed, assessable dates. */
  onTargetPercent: number | null
}

export interface TrendSeries {
  days: TrendDay[]
  weeks: WeekTrend[]
  adherence: AdherenceSummary
  start: LocalDay
  end: LocalDay
}

/** Range is 1–366 days inclusive. Invalid dates or huge ranges cannot allocate unbounded arrays. */
export function trendDays(start: LocalDay, end: LocalDay, today: LocalDay): LocalDay[] {
  assertLocalDay(start, 'Trend start')
  assertLocalDay(end, 'Trend end')
  assertLocalDay(today, 'Current day')
  if (start > end || end > today) throw new Error('Choose a historical date range ending no later than today.')
  const result: string[] = []
  for (let i = 0; i < 366; i++) {
    const day = addLocalDays(start, i)
    if (day > end) return result
    result.push(day)
  }
  if (addLocalDays(start, 366) <= end) throw new Error('Trend range may contain no more than 366 days.')
  return result
}

function fromCoverage(metric: { knownAmount: number | null; complete: boolean }): TrendValue {
  return { value: metric.knownAmount, partial: metric.knownAmount !== null && !metric.complete }
}
function known(value: number | null): TrendValue {
  return { value, partial: false }
}

/** Single source of math shared with Today and Calendar—no chart-only estimates. */
export function buildTrends(
  start: LocalDay, end: LocalDay, today: LocalDay,
  profile: Profile, sources: TrendSources, calculatedAt: string
): TrendSeries {
  const dates = trendDays(start, end, today)
  const entriesByDay = new Map<string, FoodEntry[]>()
  for (const entry of sources.intake) {
    if (entry.dayKey < start || entry.dayKey > end) continue
    const existing = entriesByDay.get(entry.dayKey) ?? []
    existing.push(entry)
    entriesByDay.set(entry.dayKey, existing)
  }
  const exerciseByDay = new Map<string, ExerciseEntry[]>()
  for (const entry of sources.activities) {
    if (entry.dayKey < start || entry.dayKey > end) continue
    const existing = exerciseByDay.get(entry.dayKey) ?? []
    existing.push(entry)
    exerciseByDay.set(entry.dayKey, existing)
  }
  const reviewByDay = new Map(sources.reviews.map(review => [review.dayKey, review]))
  const days: TrendDay[] = dates.map(day => {
    const calculated = calculateDay({
      dayKey: day, profile, weights: sources.weights,
      intake: entriesByDay.get(day) ?? [], activities: exerciseByDay.get(day) ?? [],
      goal: goalOnDay(day, sources.goals), review: reviewByDay.get(day) ?? null
    }, calculatedAt)
    const nutrients = calculated.intake.nutrients
    return {
      day, status: calculated.evaluation.status,
      isAssessable: calculated.evaluation.isAssessable, entries: calculated.entryCount,
      intakeKcal: fromCoverage(nutrients.energyKcal),
      expenditureKcal: known(calculated.expenditure.totalExpenditureKcal),
      differenceKcal: known(calculated.expenditure.differenceKcal),
      weightKg: known(calculated.recordedWeightKg),
      proteinG: fromCoverage(nutrients.proteinG),
      carbohydratesG: fromCoverage(nutrients.carbohydratesG),
      fatG: fromCoverage(nutrients.fatG),
      fiberG: fromCoverage(nutrients.fiberG),
      fluidMl: fromCoverage(calculated.intake.fluids)
    }
  })
  const counts: AdherenceSummary = {
    onTarget: 0, mixed: 0, offTarget: 0, incomplete: 0, assessable: 0, onTargetPercent: null
  }
  for (const day of days) {
    counts[day.status]++
    if (day.isAssessable) counts.assessable++
  }
  counts.onTargetPercent = counts.assessable
    ? counts.onTarget / counts.assessable * 100 : null

  const weekKeys = [...new Set(dates.map(day => weekBounds(day).start))]
  const weeks = weekKeys.map(weekStart => {
    const summary = calculateActivityWeek(weekStart, sources.activities)
    return {
      start: summary.start, end: summary.end,
      loggedMinutes: summary.loggedMinutes, missingDurationEntries: summary.missingDurationEntries, lightMinutes: summary.lightMinutes,
      moderateMinutes: summary.moderateMinutes, vigorousMinutes: summary.vigorousMinutes,
      unclassifiedMinutes: summary.unclassifiedMinutes, strengthDays: summary.loggedStrengthDays
    }
  })
  return { start, end, days, weeks, adherence: counts }
}

export function summarizeTrendMetric(days: readonly TrendDay[], metric: TrendMetric) {
  const observed = days.map(day => day[metric]).filter(v => v.value !== null)
  const partialDays = observed.filter(value => value.partial).length
  const numbers = observed.map(value => value.value).filter((value): value is number => value !== null)
  return {
    knownDays: numbers.length, missingDays: days.length - numbers.length,
    partialDays, minimum: numbers.length ? Math.min(...numbers) : null,
    maximum: numbers.length ? Math.max(...numbers) : null
  }
}
