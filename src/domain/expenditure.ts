import type { ExerciseEntry, FoodEntry, LocalDay, Profile, WeightEntry, DayReview } from './models'
import { ageOnDay } from './profile'
import { weightForDay, calculateActivityDay, type WeightEvidence } from './activity'
import { aggregateIntake, isPlainWaterEntry } from './nutrition'

/**
 * Mifflin–St Jeor RMR for adults (guide §6.5): 10kg + 6.25cm − 5age + (+5/-161).
 * Background multiplier is NOT the exercise-inclusive conventional TDEE factor;
 * it is explicitly chosen as a broad 1.00–1.60 non-workout approximation.
 * Never derive it from general activityLevel. Net exercise is added only once.
 */
export function restingKcal(kg: number, cm: number, age: number, sex: 'male' | 'female'): number | null {
  if (![kg, cm, age].every(Number.isFinite) || kg < 10 || kg > 500 ||
      cm < 50 || cm > 260 || age < 18 || age > 120 || !Number.isInteger(age) ||
      !['male', 'female'].includes(sex)) return null
  const result = 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161)
  return result > 0 ? result : null
}

export interface ExpenditureSummary {
  restingKcal: number | null
  backgroundKcal: number | null
  workoutIncrementKcal: number | null
  totalExpenditureKcal: number | null
  differenceKcal: number | null
  weight: WeightEvidence
  multiplier: number | null
  explanation: string[]
}

export function calculateExpenditure(
  day: LocalDay, profile: Profile, weights: readonly WeightEntry[],
  activities: readonly ExerciseEntry[], intake: readonly FoodEntry[],
  review: DayReview | null
): ExpenditureSummary {
  const evidence = weightForDay(day, weights)
  const age = ageOnDay({
    birthDate: profile.birthDate,
    ageYears: profile.ageYears ?? null,
    ageAsOf: profile.ageAsOf ?? null
  }, day)
  const adult = age !== null && age >= 18
  const sex = profile.sexForEquation
  const rmr = adult && evidence.weightKg !== null && profile.heightCm != null &&
    (sex === 'male' || sex === 'female')
    ? restingKcal(evidence.weightKg, profile.heightCm, age, sex) : null
  const candidate = profile.backgroundActivityMultiplier
  const multiplier = candidate != null && Number.isFinite(candidate) &&
    candidate >= 1 && candidate <= 1.6 ? candidate : null
  const background = rmr !== null && multiplier !== null ? rmr * multiplier : null
  const exercise = calculateActivityDay(day, activities, weights, adult)
  // No logged sessions is explicitly known zero ONLY on user-marked-complete days.
  const increment = !review?.isComplete ? null :
    exercise.entries === 0 ? 0 :
      exercise.energyCoverageComplete ? exercise.knownIncrementalKcal : null
  const total = background !== null && increment !== null ? background + increment : null
  const calories = aggregateIntake(intake.filter(entry => entry.dayKey === day)).nutrients.energyKcal
  // A logged water-only day cannot establish that all food calories are known.
  const hasNonWaterIntake = intake.some(entry => entry.dayKey === day && !isPlainWaterEntry(entry))
  const difference = total !== null && review?.isComplete && calories.complete && hasNonWaterIntake &&
    calories.knownAmount !== null ? calories.knownAmount - total : null

  const explanation: string[] = []
  if (!adult) explanation.push('Adult energy equations are unavailable for an under-18 or unconfirmed age.')
  else if (rmr === null) explanation.push('Resting estimate unavailable: requires valid age, height, weight on or before this day and an explicitly selected equation constant.')
  else explanation.push('Approximate resting kcal = 10 × weightKg + 6.25 × heightCm − 5 × age + equation constant (Mifflin–St Jeor).')
  if (evidence.source === 'carriedForward') explanation.push('Weight was carried forward from ' + evidence.sourceDay + '; no future weight was used.')
  if (background === null) explanation.push('Background energy unavailable until a non-workout multiplier (1.00–1.60) is explicitly chosen in Settings and resting inputs are complete.')
  else explanation.push('Background kcal ≈ resting kcal × user-selected non-workout multiplier ' + multiplier + '; this approximation excludes separately logged workouts.')
  if (!review?.isComplete) explanation.push('Total daily expenditure remains unavailable until the day is explicitly marked complete.')
  else if (exercise.entries === 0) explanation.push('Marked-complete day has no logged workouts; the workout increment is treated as zero for this completed record only.')
  else if (!exercise.energyCoverageComplete) explanation.push('Some logged workouts have unknown incremental energy, so total expenditure is withheld.')
  else explanation.push('Known active/incremental workout kcal are added once, above the background estimate; gross workout calories are not included.')
  if (difference === null) explanation.push('Estimated energy difference needs fully known logged intake and total estimated expenditure; it is not a weight-change prediction.')
  return {
    restingKcal: rmr, backgroundKcal: background, workoutIncrementKcal: increment,
    totalExpenditureKcal: total, differenceKcal: difference,
    weight: evidence, multiplier, explanation
  }
}
