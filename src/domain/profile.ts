import type { ActivityLevel, DailyTargets, HealthGoal, LocalDay, UnitPreferences } from './models'
import { parseLocalDay } from '../lib/localDate'

export interface ProfileValues {
  birthDate: LocalDay | null
  ageYears: number | null
  ageAsOf: LocalDay | null
  heightCm: number
  sexForEquation: 'male' | 'female' | null
  activityLevel: ActivityLevel | null
  goal: HealthGoal
  units: UnitPreferences
}

export interface GoalValues {
  effectiveFrom: LocalDay
  goalType: HealthGoal
  targetWeightKg: number | null
  targets: DailyTargets
}

export const EMPTY_TARGETS: DailyTargets = {
  energyKcal: null,
  proteinG: null,
  carbohydratesG: null,
  fatG: null,
  fiberG: null,
  sodiumMg: null,
  fluidMl: null,
  activityMinutes: null
}

export function assertLocalDay(day: LocalDay, field = 'Date'): void {
  const d = parseLocalDay(day)
  if (!d || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
    throw new Error(`${field} must be a valid YYYY-MM-DD date.`)
  }
}

function assertNumber(value: number, min: number, max: number, field: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`)
  }
}

export function assertWeight(weightKg: number): void {
  assertNumber(weightKg, 10, 500, 'Weight (kg)')
}

export function ageOnDay(profile: Pick<ProfileValues, 'birthDate' | 'ageYears' | 'ageAsOf'>, day: LocalDay): number | null {
  const reference = parseLocalDay(day)
  if (!reference) return null
  const startDay = profile.birthDate ?? profile.ageAsOf
  if (!startDay) return null
  const start = parseLocalDay(startDay)
  if (!start || reference < start) return null
  let years = reference.getFullYear() - start.getFullYear()
  const monthDayPassed = reference.getMonth() > start.getMonth() ||
    (reference.getMonth() === start.getMonth() && reference.getDate() >= start.getDate())
  if (!monthDayPassed) years -= 1
  return profile.birthDate ? years : profile.ageYears == null ? null : profile.ageYears + years
}

export function validateProfile(values: ProfileValues, asOfDay: LocalDay): void {
  assertLocalDay(asOfDay)
  if (values.birthDate) {
    assertLocalDay(values.birthDate, 'Date of birth')
    if (values.ageYears !== null || values.ageAsOf !== null) throw new Error('Use either date of birth or dated age.')
  } else {
    if (!Number.isInteger(values.ageYears) || values.ageYears === null || values.ageYears < 0 || values.ageYears > 120) {
      throw new Error('Age must be a whole number between 0 and 120.')
    }
    if (values.ageAsOf === null) throw new Error('An as-of date is required with age.')
    assertLocalDay(values.ageAsOf, 'Age as-of date')
    if (values.ageAsOf > asOfDay) throw new Error('Age as-of date cannot be in the future.')
  }
  const age = ageOnDay(values, asOfDay)
  if (age === null || age < 0 || age > 120) throw new Error('Enter a valid birth date or age and as-of date.')
  assertNumber(values.heightCm, 50, 260, 'Height (cm)')
  if (!['maintain', 'lose', 'gain', 'general-wellness'].includes(values.goal)) throw new Error('Choose a goal.')
  if (!['kg', 'lb'].includes(values.units.mass) || !['cm', 'ft-in'].includes(values.units.height) ||
      !['ml', 'fl-oz'].includes(values.units.fluid)) throw new Error('Unsupported unit preference.')
  if (values.sexForEquation !== null && !['male', 'female'].includes(values.sexForEquation)) {
    throw new Error('Unknown equation parameter.')
  }
  if (values.activityLevel !== null &&
    !['sedentary', 'light', 'moderate', 'high', 'very-high'].includes(values.activityLevel)) {
    throw new Error('Unknown background activity setting.')
  }
}

const TARGET_LIMITS: Record<keyof DailyTargets, number> = {
  energyKcal: 15000,
  proteinG: 1000,
  carbohydratesG: 2000,
  fatG: 1000,
  fiberG: 500,
  sodiumMg: 50000,
  fluidMl: 30000,
  activityMinutes: 1440
}

export function validateGoal(goal: GoalValues, today: LocalDay, existing: boolean): void {
  assertLocalDay(goal.effectiveFrom, 'Goal effective date')
  if (existing && goal.effectiveFrom < today) throw new Error('New goal changes cannot be backdated; historical goals are preserved.')
  if (!['maintain', 'lose', 'gain', 'general-wellness'].includes(goal.goalType)) throw new Error('Choose a goal.')
  if (goal.targetWeightKg !== null) assertWeight(goal.targetWeightKg)
  for (const field of Object.keys(TARGET_LIMITS) as (keyof DailyTargets)[]) {
    const value = goal.targets[field]
    if (value !== null) {
      assertNumber(value, field === 'energyKcal' ? 1 : 0, TARGET_LIMITS[field], field)
    }
  }
}
