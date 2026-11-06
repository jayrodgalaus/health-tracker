/**
 * Domain types contain no React or storage dependencies.
 *
 * Dates are local calendar keys (YYYY-MM-DD), not UTC timestamps.
 * Unknown nutrient measurements must remain null; zero means measured zero.
 */
export type LocalDay = string
export type IsoTimestamp = string
export type RecordId = string

export type MassUnit = 'g' | 'kg' | 'oz' | 'lb'
export type LengthUnit = 'cm' | 'ft-in'
export type VolumeUnit = 'ml' | 'l' | 'fl-oz' | 'cup'
export type ServingUnit = 'g' | 'ml' | 'oz' | 'fl-oz' | 'piece' | 'serving'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very-high'
export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous'
/** Keep the Phase 0 spelling for backwards compatibility with locally saved profiles. */
export type HealthGoal = 'maintain' | 'lose' | 'gain' | 'general-wellness'

export interface UnitPreferences {
  mass: 'kg' | 'lb'
  height: LengthUnit
  fluid: 'ml' | 'fl-oz'
}

export interface Profile {
  /** Phase 0 used 'primary'; changing the key would orphan previously saved profiles. */
  id: 'primary'
  birthDate: LocalDay | null
  /** Optional alternative to DOB, with a dated age rather than an undated approximation. */
  ageYears?: number | null
  ageAsOf?: LocalDay | null
  heightCm: number | null
  /** Equation parameter is deliberately optional and never inferred. */
  sexForEquation?: 'male' | 'female' | null
  activityLevel: ActivityLevel | null
  goal: HealthGoal | null
  units: UnitPreferences
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

/** Each target is optional; unknown/unspecified values are null, not zero. */
export interface DailyTargets {
  energyKcal: number | null
  proteinG: number | null
  carbohydratesG: number | null
  fatG: number | null
  fiberG: number | null
  sodiumMg: number | null
  fluidMl: number | null
  activityMinutes: number | null
}

export interface GoalPeriod {
  id: RecordId
  /** Effective date allows history to use the target in effect at that time. */
  effectiveFrom: LocalDay
  /** Added in Phase 1; optional on pre-existing Phase 0 records. */
  goalType?: HealthGoal
  targetWeightKg?: number | null
  targets: DailyTargets
  createdAt: IsoTimestamp
}

/** Numeric values are in the explicit units in their property names. */
export interface NutrientSnapshot {
  energyKcal: number | null
  proteinG: number | null
  carbohydratesG: number | null
  fatG: number | null
  saturatedFatG: number | null
  fiberG: number | null
  sugarsG: number | null
  sodiumMg: number | null
}

/** The label's exact measurement basis; no implicit oz/ml or piece/g conversions. */
export interface LabelBasis {
  quantity: number
  unit: ServingUnit
}

export interface SavedFood {
  id: RecordId
  name: string
  brand: string | null
  labelBasis: LabelBasis
  nutrientsPerBasis: NutrientSnapshot
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface FoodEntry {
  id: RecordId
  dayKey: LocalDay
  recordedAt: IsoTimestamp
  kind: 'food' | 'beverage'
  name: string
  savedFoodId: RecordId | null
  /** Entered amount and original label basis remain available for audits. */
  quantity: number
  unit: ServingUnit
  labelBasis: LabelBasis
  /** Immutable-at-log-time nutrient values for the amount consumed. */
  nutrientsSnapshot: NutrientSnapshot
  /** A beverage is still ONE food entry; its energy must not be counted twice. */
  fluidMl: number | null
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface ExerciseEntry {
  id: RecordId
  dayKey: LocalDay
  startedAt: IsoTimestamp
  activity: string
  durationMinutes: number
  intensity: ExerciseIntensity | null
  /** Only populate when a supported explicit estimation method exists. */
  estimatedEnergyKcal: number | null
  estimationMethod: string | null
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface WeightEntry {
  /** Retained legacy id primary key; repository enforces one primary record/day. */
  id: RecordId
  dayKey: LocalDay
  recordedAt: IsoTimestamp
  /** Canonical storage unit. Never infer weight for an unlogged day. */
  weightKg: number
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface DayReview {
  dayKey: LocalDay
  /** Incomplete/unlogged days are not evaluated as off-target. */
  isComplete: boolean
  markedAt: IsoTimestamp | null
}
