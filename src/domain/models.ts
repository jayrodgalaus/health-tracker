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
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'
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
  ageYears?: number | null
  ageAsOf?: LocalDay | null
  heightCm: number | null
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
  effectiveFrom: LocalDay
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
  /** Optional for legacy Phase 0 entries; unknown values are never assumed zero. */
  potassiumMg?: number | null
}

/** Exact reference quantity for the entered label, e.g. 1 serving, 100 g or 100 ml. */
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
  /** Optional fields are backward compatible with the existing Dexie v1 store. */
  kind?: 'food' | 'beverage'
  servingDescription?: string | null
  fluidMlPerBasis?: number | null
  isFavorite?: boolean
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface FoodEntry {
  id: RecordId
  dayKey: LocalDay
  /** Audit timestamp: not the logged local day. */
  recordedAt: IsoTimestamp
  kind: 'food' | 'beverage'
  /** Plain water is a beverage with zero known kcal; other drinks may have unknown kcal. */
  beverageType?: 'water' | 'other'
  meal?: MealCategory | null
  name: string
  savedFoodId: RecordId | null
  quantity: number
  unit: ServingUnit
  labelBasis: LabelBasis
  /** Consumed quantity's nutrient snapshot; never rewritten by saved-food edits. */
  nutrientsSnapshot: NutrientSnapshot
  /** Reference label before scaling; preserved for transparent historical edits. */
  referenceNutrientsSnapshot?: NutrientSnapshot
  servingDescription?: string | null
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
  weightKg: number
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

export interface DayReview {
  dayKey: LocalDay
  isComplete: boolean
  markedAt: IsoTimestamp | null
}

/** Browser-only preferences, never user health metrics or remote settings. */
export interface AppSettings {
  id: 'local'
  waterPresetsMl: number[]
  updatedAt: IsoTimestamp
}
