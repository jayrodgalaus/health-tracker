import { describe, expect, it } from 'vitest'
import type { DayReview, ExerciseEntry, FoodEntry, Profile, WeightEntry } from './models'
import { emptyNutrition } from './nutrition'
import { calculateExpenditure, restingKcal } from './expenditure'

const timestamp = '2026-11-06T12:00:00Z'
const profile: Profile = {
  id: 'primary', birthDate: '1990-11-06', heightCm: 170, sexForEquation: 'male',
  activityLevel: null, backgroundActivityMultiplier: 1.1, goal: 'maintain',
  units: { mass: 'kg', height: 'cm', fluid: 'ml' }, createdAt: timestamp, updatedAt: timestamp
}
const weight = (dayKey: string, weightKg: number): WeightEntry => ({ id: dayKey, dayKey, weightKg,
  recordedAt: timestamp, createdAt: timestamp, updatedAt: timestamp })
const meal: FoodEntry = {
  id: 'meal', dayKey: '2026-11-06', kind: 'food', name: 'Synthetic meal',
  savedFoodId: null, quantity: 1, unit: 'serving', labelBasis: { quantity: 1, unit: 'serving' },
  nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 2000 }, fluidMl: null,
  recordedAt: timestamp, createdAt: timestamp, updatedAt: timestamp
}
const workout: ExerciseEntry = {
  id: 'workout', dayKey: '2026-11-06', activity: 'Walking', durationMinutes: 30,
  intensity: 'moderate', estimationMethod: 'metNet', met: 4, estimatedEnergyKcal: null,
  startedAt: timestamp, createdAt: timestamp, updatedAt: timestamp
}
const complete: DayReview = { dayKey: '2026-11-06', isComplete: true, markedAt: timestamp }

describe('optional adult expenditure', () => {
  it('uses Mifflin-St Jeor constants without multiplying workouts twice', () => {
    expect(restingKcal(70, 170, 36, 'male')).toBeCloseTo(1587.5)
    const summary = calculateExpenditure('2026-11-06', profile, [weight('2026-11-06', 70)], [workout], [meal], complete)
    expect(summary.restingKcal).toBeCloseTo(1587.5)
    expect(summary.backgroundKcal).toBeCloseTo(1746.25)
    expect(summary.workoutIncrementKcal).toBeCloseTo(110.25)
    expect(summary.totalExpenditureKcal).toBeCloseTo(1856.5)
    expect(summary.differenceKcal).toBeCloseTo(143.5)
  })
  it('shows logged workout expenditure and a provisional full-day estimate before completion', () => {
    const w = [weight('2026-11-06', 70)]
    const open = calculateExpenditure('2026-11-06', profile, w, [workout], [meal], null)
    expect(open.workoutIncrementKcal).toBeCloseTo(110.25)
    expect(open.totalExpenditureKcal).toBeCloseTo(1856.5)
    expect(open.differenceKcal).toBeCloseTo(143.5) // Provisional, even while day is open.
    expect(open.explanation.join(' ')).toContain('provisional FULL-DAY')
    const explicitOpen = calculateExpenditure('2026-11-06', profile, w, [workout], [meal], {
      dayKey: '2026-11-06', isComplete: false, markedAt: null
    })
    expect(explicitOpen.totalExpenditureKcal).toBeCloseTo(1856.5)
    expect(explicitOpen.differenceKcal).toBeCloseTo(143.5)
  })
  it('withholds provisional difference for incomplete intake or water-only logs', () => {
    const w = [weight('2026-11-06', 70)]
    const incomplete = { ...meal, id: 'unknown-energy', nutrientsSnapshot: { ...emptyNutrition(), energyKcal: null } }
    expect(calculateExpenditure('2026-11-06', profile, w, [workout], [meal, incomplete], null).differenceKcal).toBeNull()
    const water = { ...meal, id: 'water', kind: 'beverage' as const,
      beverageType: 'water' as const, fluidMl: 250,
      nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 0 } }
    expect(calculateExpenditure('2026-11-06', profile, w, [workout], [water], null).differenceKcal).toBeNull()
    expect(calculateExpenditure('2026-11-06', profile, w, [workout], [], null).differenceKcal).toBeNull()
  })
  it('shows only the known workout subtotal when another session has unknown energy', () => {
    const w = [weight('2026-11-06', 70)]
    const unknown = { ...workout, id: 'unknown', estimationMethod: 'unknown' as const, met: null }
    for (const review of [null, complete]) {
      const result = calculateExpenditure('2026-11-06', profile, w, [workout, unknown], [meal], review)
      expect(result.workoutIncrementKcal).toBeCloseTo(110.25)
      expect(result.totalExpenditureKcal).toBeNull()
      expect(result.differenceKcal).toBeNull()
      expect(result.explanation.join(' ')).toContain('1/2')
    }
    const noneKnown = calculateExpenditure('2026-11-06', profile, w, [unknown], [meal], null)
    expect(noneKnown.workoutIncrementKcal).toBeNull()
    expect(noneKnown.totalExpenditureKcal).toBeNull()
  })
  it('refuses TDEE without explicit multiplier, sex constant, DOB, or prior weight', () => {
    const weights = [weight('2026-11-07', 70)]
    expect(calculateExpenditure('2026-11-06', profile, weights, [], [meal], complete).totalExpenditureKcal).toBeNull()
    expect(calculateExpenditure('2026-11-06', { ...profile, backgroundActivityMultiplier: null }, [weight('2026-11-06',70)], [], [meal], complete).totalExpenditureKcal).toBeNull()
    expect(calculateExpenditure('2026-11-06', { ...profile, sexForEquation: null }, [weight('2026-11-06',70)], [], [meal], complete).restingKcal).toBeNull()
  })
  it('requires complete workout and food logs for expenditure and difference', () => {
    const w = [weight('2026-11-06',70)]
    const openWithoutWorkouts = calculateExpenditure('2026-11-06', profile, w, [], [meal], null)
    expect(openWithoutWorkouts.workoutIncrementKcal).toBeNull()
    expect(openWithoutWorkouts.totalExpenditureKcal).toBeNull()
    const exercise = { ...workout, met: null }
    const partial = calculateExpenditure('2026-11-06', profile, w, [exercise], [meal], complete)
    expect(partial.totalExpenditureKcal).toBeNull()
    const noWorkout = calculateExpenditure('2026-11-06', profile, w, [], [meal], complete)
    expect(noWorkout.workoutIncrementKcal).toBe(0)
    expect(noWorkout.totalExpenditureKcal).not.toBeNull()
    expect(calculateExpenditure('2026-11-06', profile, w, [], [meal, { ...meal, id: 'missing', nutrientsSnapshot: emptyNutrition() }], complete).differenceKcal).toBeNull()
    expect(calculateExpenditure('2026-11-06', profile, w, [], [], complete).differenceKcal).toBeNull()
  })
  it('prevents under-18 and future-weight expenditure', () => {
    const w = [weight('2026-11-06',70)]
    expect(calculateExpenditure('2026-11-06', { ...profile, birthDate: '2012-11-06' }, w, [], [meal], complete).totalExpenditureKcal).toBeNull()
    expect(calculateExpenditure('2026-11-06', profile, [weight('2026-11-07',70)], [], [meal], complete).restingKcal).toBeNull()
  })
  it('keeps calculated background separate from user-chosen energy target', () => {
    expect(restingKcal(70,170,36,'female')).toBeCloseTo(1421.5)
    expect(restingKcal(70,170,17,'female')).toBeNull()
    expect(restingKcal(Infinity,170,36,'male')).toBeNull()
  })
})
