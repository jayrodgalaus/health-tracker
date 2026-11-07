import { describe, expect, it } from 'vitest'
import { calculateDay, EVALUATION_RULE_VERSION, type DayCalculationContext } from './evaluation'
import type { ExerciseEntry, FoodEntry, Profile } from './models'
import { EMPTY_TARGETS } from './profile'
import { emptyNutrition } from './nutrition'

const now = '2026-11-06T10:00:00Z'
const profile: Profile = {
  id: 'primary', birthDate: '1990-11-06', heightCm: 170, sexForEquation: null,
  activityLevel: null, goal: 'maintain', units: { mass: 'kg', height: 'cm', fluid: 'ml' },
  createdAt: now, updatedAt: now
}
const goal = (energyKcal: number | null = 2000, proteinG: number | null = null) => ({
  id: 'goal', effectiveFrom: '2026-01-01', targets: { ...EMPTY_TARGETS, energyKcal, proteinG }, createdAt: now
})
const entry = (kcal: number | null, name = 'Recorded food'): FoodEntry => ({
  id: name, dayKey: '2026-11-06', name, kind: 'food', savedFoodId: null,
  quantity: 1, unit: 'serving', labelBasis: { quantity: 1, unit: 'serving' },
  nutrientsSnapshot: { ...emptyNutrition(), energyKcal: kcal },
  fluidMl: null, recordedAt: now, createdAt: now, updatedAt: now
})
const context = (overrides: Partial<DayCalculationContext> = {}): DayCalculationContext => ({
  dayKey: '2026-11-06', profile, goal: goal(), weights: [], intake: [entry(2000)], activities: [],
  review: { dayKey: '2026-11-06', isComplete: true, markedAt: now }, ...overrides
})
const assess = (overrides: Partial<DayCalculationContext> = {}) => calculateDay(context(overrides), now).evaluation

describe('conservative reproducible goal alignment', () => {
  it('does not score an unmarked day green or red, but shows provisional rules', () => {
    const evaluation = assess({ review: null, intake: [entry(3000)] })
    expect(evaluation.status).toBe('incomplete')
    expect(evaluation.isComplete).toBe(false)
    expect(evaluation.results[0]?.state).toBe('significantDeviation')
    expect(evaluation.evaluationRuleVersion).toBe(EVALUATION_RULE_VERSION)
  })
  it('shows provisional expenditure but keeps an unmarked day neutral across views', () => {
    const exercise: ExerciseEntry = {
      id: 'manual', dayKey: '2026-11-06', startedAt: now,
      activity: 'Treadmill walking', durationMinutes: 30, intensity: null,
      estimationMethod: 'manualActive', estimatedEnergyKcal: 90, met: null,
      createdAt: now, updatedAt: now
    }
    const report = calculateDay(context({
      review: null,
      profile: { ...profile, sexForEquation: 'male', backgroundActivityMultiplier: 1.2 },
      weights: [{
        id: 'weight', dayKey: '2026-11-06', weightKg: 70,
        recordedAt: now, createdAt: now, updatedAt: now
      }],
      activities: [exercise]
    }), now)
    expect(report.activity.knownIncrementalKcal).toBe(90)
    expect(report.expenditure.workoutIncrementKcal).toBe(90)
    expect(report.expenditure.totalExpenditureKcal).not.toBeNull()
    expect(report.expenditure.differenceKcal).toBeNull()
    expect(report.evaluation.status).toBe('incomplete')
  })
  it('requires at least one fully known non-water intake for energy alignment', () => {
    expect(assess({ intake: [] }).status).toBe('incomplete')
    expect(assess({ intake: [entry(null)] }).results[0]?.state).toBe('notEvaluated')
    expect(assess({ intake: [entry(2000), entry(null, 'unknown')] }).status).toBe('incomplete')
    expect(assess({ intake: [entry(2000), entry(null, 'unknown')] }).assessedRuleCount).toBe(0)
  })
  it('uses transparent 15/30 percent bands on configured calorie targets', () => {
    expect(assess().status).toBe('onTarget')
    expect(assess({ intake: [entry(2300)] }).status).toBe('onTarget')
    expect(assess({ intake: [entry(2360)] }).status).toBe('mixed')
    expect(assess({ intake: [entry(2620)] }).status).toBe('offTarget')
    const result = assess({ intake: [entry(2620)] }).results[0]
    expect(result).toMatchObject({ label: 'Calories consumed', actual: 2620, target: 2000, unit: 'kcal' })
    expect(result?.explanation).toContain('2620')
    expect(result?.explanation).toContain('2000')
  })
  it('keeps a complete day unassessed when one selected target lacks coverage', () => {
    const evaluation = assess({ goal: goal(2000, 80) })
    expect(evaluation.expectedRuleCount).toBe(2)
    expect(evaluation.results.some(result => result.state === 'notEvaluated')).toBe(true)
    expect(evaluation.status).toBe('incomplete')
    expect(evaluation.isAssessable).toBe(false)
  })
  it('compares known protein only against an explicit configured goal', () => {
    const protein = { ...entry(2000), nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 2000, proteinG: 40 } }
    expect(assess({ goal: goal(2000, 80), intake: [protein] }).status).toBe('mixed')
    expect(assess({ goal: goal(2000, 80), intake: [{ ...protein, nutrientsSnapshot: { ...protein.nutrientsSnapshot, proteinG: 35 } }] }).status).toBe('offTarget')
  })
  it('honors effective-dated alignment settings rather than hidden fixed bands', () => {
    const customized = {
      ...goal(),
      ruleSettings: {
        energyAlignedPercent: 25,
        energyAttentionPercent: 45,
        minimumLargeDeviationPercent: 40,
        sodiumLargeDeviationPercent: 35
      }
    }
    expect(assess({ goal: customized, intake: [entry(2450)] }).status).toBe('onTarget')
    expect(assess({ goal: customized, intake: [entry(2700)] }).status).toBe('mixed')
    expect(assess({ goal: customized, intake: [entry(3000)] }).status).toBe('offTarget')
    expect(assess({ goal: customized }).ruleSettings.energyAlignedPercent).toBe(25)
  })
  it('never uses a missing target or underage model to assign a score', () => {
    expect(assess({ goal: null }).status).toBe('incomplete')
    expect(assess({ profile: { ...profile, birthDate: '2013-11-06' } }).status).toBe('incomplete')
    expect(assess({ profile: { ...profile, birthDate: '2013-11-06' } }).results).toEqual([])
  })
  it('prevents rest day or no-meal day from being off-target solely for not logging', () => {
    expect(assess({ activities: [], intake: [] }).status).toBe('incomplete')
    const water = { ...entry(0), id: 'water', kind: 'beverage' as const, beverageType: 'water' as const, fluidMl: 250 }
    expect(assess({ intake: [water] }).status).toBe('incomplete')
  })
  it('assesses sodium at 1,905.3/2,000 mg when the other 3 of 16 entries are plain water', () => {
    const items = Array.from({ length: 13 }, (_, i): FoodEntry => ({
      ...entry(150, 'Food ' + i),
      nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 150, sodiumMg: i === 12 ? 105.3 : 150 }
    }))
    const water = Array.from({ length: 3 }, (_, i): FoodEntry => ({
      ...entry(0, 'Water ' + i), kind: 'beverage', beverageType: 'water',
      fluidMl: 250, nutrientsSnapshot: { ...emptyNutrition(), energyKcal: 0 }
    }))
    const sodiumGoal = {
      ...goal(null), targets: { ...EMPTY_TARGETS, sodiumMg: 2000 }
    }
    const report = calculateDay(context({ intake: [...items, ...water], goal: sodiumGoal }), now)
    const sodium = report.evaluation.results.find(r => r.label === 'Sodium')
    expect(report.intake.nutrients.sodiumMg).toMatchObject({
      knownAmount: 1905.3, knownEntryCount: 13, unknownEntryCount: 0,
      totalEntryCount: 13, complete: true
    })
    expect(report.intake.fluids.knownAmount).toBe(750)
    expect(sodium).toMatchObject({ state: 'pass', actual: 1905.3, target: 2000 })
    expect(report.evaluation.status).toBe('onTarget')
    const unknownDrink = {
      ...entry(null, 'Unspecified tea'), kind: 'beverage' as const,
      beverageType: 'other' as const, fluidMl: 200
    }
    const incomplete = calculateDay(context({
      intake: [...items, ...water, unknownDrink], goal: sodiumGoal
    }), now)
    expect(incomplete.intake.nutrients.sodiumMg).toMatchObject({
      knownEntryCount: 13, unknownEntryCount: 1, totalEntryCount: 14, complete: false
    })
    expect(incomplete.evaluation.results.find(r => r.label === 'Sodium')).toMatchObject({
      state: 'notEvaluated'
    })
  })
  it('keeps water-only nutrient goals unassessable while fluid goals can be assessed', () => {
    const water: FoodEntry = {
      ...entry(0, 'Water'), kind: 'beverage', beverageType: 'water', fluidMl: 250
    }
    const waterOnly = assess({
      intake: [water], goal: {
        ...goal(null),
        targets: { ...EMPTY_TARGETS, sodiumMg: 2000, fluidMl: 250 }
      }
    })
    expect(waterOnly.results.find(r => r.label === 'Sodium')?.state).toBe('notEvaluated')
    expect(waterOnly.results.find(r => r.label === 'Logged fluid')?.state).toBe('pass')
    expect(waterOnly.status).toBe('incomplete')
  })
  it('repeats exactly for unchanged context and supplied calculatedAt', () => {
    expect(assess()).toEqual(assess())
  })
})
