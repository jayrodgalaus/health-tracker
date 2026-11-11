import type { HealthGoal } from './models'

/**
 * Display-only goal reference bands (fraction of full-day estimated expenditure).
 * These are project tracking heuristics, NOT medically validated calorie targets:
 * maintain ±10%, lower weight −15..−5%, higher weight +5..+15%, wellness ±15%.
 * Research on individual energy balance and gradual weight change:
 * https://www.cdc.gov/healthy-weight-growth/losing-weight/
 * https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC5470183/
 * Only color a marked-complete day with assessable energy; otherwise neutral.
 */
export const ENERGY_GOAL_BANDS: Record<HealthGoal, { min: number; max: number }> = {
  maintain: { min: -0.10, max: 0.10 },
  lose: { min: -0.15, max: -0.05 },
  gain: { min: 0.05, max: 0.15 },
  'general-wellness': { min: -0.15, max: 0.15 }
}

export type EnergyGaugeState = 'aligned' | 'outside' | 'unassessed'
export interface EnergyGaugeResult {
  state: EnergyGaugeState
  /** Eaten / expended, capped to the arc extent 0..1. */
  fill: number
  differenceRatio: number | null
}

/** Pure visual classification; never changes daily goal scoring or calorie needs. */
export function energyGaugeResult(
  consumedKcal: number | null,
  totalExpendedKcal: number | null,
  differenceKcal: number | null,
  goal: HealthGoal | null | undefined,
  dayComplete: boolean,
  intakeComplete: boolean
): EnergyGaugeResult {
  if (consumedKcal === null || totalExpendedKcal === null ||
      !Number.isFinite(consumedKcal) || consumedKcal < 0 ||
      !Number.isFinite(totalExpendedKcal) || totalExpendedKcal <= 0) {
    return { state: 'unassessed', fill: 0, differenceRatio: null }
  }
  const fill = Math.min(1, Math.max(0, consumedKcal / totalExpendedKcal))
  if (!dayComplete || !intakeComplete || differenceKcal === null ||
      !Number.isFinite(differenceKcal) || goal == null) {
    return { state: 'unassessed', fill, differenceRatio: null }
  }
  const ratio = differenceKcal / totalExpendedKcal
  const band = ENERGY_GOAL_BANDS[goal]
  if (!band) return { state: 'unassessed', fill, differenceRatio: null }
  return {
    state: ratio >= band.min - 1e-12 && ratio <= band.max + 1e-12 ? 'aligned' : 'outside',
    fill, differenceRatio: ratio
  }
}
