import { describe, expect, it } from 'vitest'
import type { ExerciseEntry, FoodEntry, Profile, WeightEntry } from './models'
import { emptyNutrition } from './nutrition'
import { buildTrendExcelReport } from './trendExcelReport'

const now = '2026-11-08T08:00:00Z'
const profile: Profile = {
  id: 'primary', birthDate: '1990-03-12', heightCm: 170, sexForEquation: 'male',
  backgroundActivityMultiplier: 1.2, activityLevel: null, goal: 'maintain',
  units: { mass: 'lb', height: 'cm', fluid: 'fl-oz' },
  createdAt: now, updatedAt: now
}
function food(
  id: string, dayKey: string, kcal: number | null, fluidMl: number | null = null,
  kind: 'food' | 'beverage' = 'food', water = false
): FoodEntry {
  return {
    id, dayKey, name: water ? 'Water' : id,
    kind, beverageType: water ? 'water' : 'other',
    recordedAt: now, savedFoodId: null, quantity: 1, unit: 'serving',
    labelBasis: { quantity: 1, unit: 'serving' },
    nutrientsSnapshot: { ...emptyNutrition(), energyKcal: kcal, proteinG: kcal === null ? null : 10 },
    fluidMl, createdAt: now, updatedAt: now
  }
}
function weight(id: string, dayKey: string, kg: number): WeightEntry {
  return { id, dayKey, recordedAt: now, weightKg: kg, createdAt: now, updatedAt: now }
}
const workout: ExerciseEntry = {
  id: 'walk', dayKey: '2026-11-06', activity: 'Walking', durationMinutes: 30,
  startedAt: now, intensity: null, estimatedEnergyKcal: 120,
  estimationMethod: 'manualActive', createdAt: now, updatedAt: now
}

describe('Excel trends report uses the canonical day summaries', () => {
  it('exports every inclusive day while preserving unknowns, partial totals, and actual weight dates', () => {
    const sources = {
      intake: [
        food('Meal', '2026-11-06', 400),
        food('Unknown drink', '2026-11-06', null, 250, 'beverage'),
        food('Water', '2026-11-06', 0, 500, 'beverage', true),
        food('Zero calorie drink', '2026-11-08', 0, 200, 'beverage')
      ],
      activities: [workout],
      weights: [weight('earlier', '2026-11-05', 70), weight('measured', '2026-11-08', 71)],
      goals: [],
      reviews: [{ dayKey: '2026-11-08', isComplete: true, markedAt: now }]
    }
    const unchanged = JSON.stringify(sources)
    const tabs = buildTrendExcelReport(
      '2026-11-06', '2026-11-08', '2026-11-08', profile, sources,
      { carbohydratesG: null, sugarsG: null, sodiumMg: null }, now
    )
    expect(tabs.map(tab => tab.name)).toEqual([
      'Energy', 'Nutrition', 'Logged Fluids', 'Weight Records',
      'Food & Drink Entries', 'Fluid Entries', 'Exercise Entries', 'Weight Entries', 'Report Info'
    ])
    const [energy, nutrition, fluids, weights, entries] = tabs
    expect(energy!.rows.map(row => row[0])).toEqual(['2026-11-06', '2026-11-07', '2026-11-08'])
    expect(energy!.rows[0]?.[2]).toBe(400)
    expect(energy!.rows[0]?.[3]).toBe('Partial (1/2)')
    expect(energy!.rows[0]?.[7]).toBe(120)
    expect(energy!.rows[0]?.[9]).toBeGreaterThan(0) // Total expenditure is assessable independently of intake.
    expect(energy!.rows[0]?.[10]).toBeNull()
    expect(energy!.rows[0]?.[11]).toBe(70)
    expect(energy!.rows[0]?.[12]).toBe('carriedForward')
    expect(energy!.rows[0]?.[13]).toBe('2026-11-05')
    expect(energy!.rows[1]?.[2]).toBeNull()
    expect(energy!.rows[2]?.[2]).toBe(0) // Explicitly known zero is not blank.
    expect(nutrition!.rows[0]?.[3]).toBe(1) // Non-water drink only.
    const protein = nutrition!.columns.findIndex(column => column.header === 'Protein (g)')
    expect(nutrition!.rows[0]?.[protein]).toBe(10)
    expect(nutrition!.rows[0]?.[protein + 1]).toBe('Partial (1/2)')
    expect(fluids!.rows[0]?.slice(2)).toEqual([750, 'Complete (2/2)', 2, 2, 0])
    expect(fluids!.rows[1]?.[2]).toBeNull()
    expect(weights!.rows[0]?.[2]).toBeNull() // Earlier weight is not a measurement today.
    expect(weights!.rows[0]?.[5]).toBe(70)
    expect(weights!.rows[2]?.[2]).toBe(71)
    const water = entries!.rows.find(row => row[2] === 'Water')!
    expect(water[9]).toBe(500)
    expect(water[10]).toBeNull() // Plain water does not appear as a nutrition item.
    expect(JSON.stringify(sources)).toBe(unchanged)
  })

  it('keeps completed-day archived energy data instead of recalculating it', () => {
    const sources = {
      intake: [food('meal', '2026-11-06', 500)],
      activities: [],
      weights: [weight('old', '2026-11-06', 70)],
      goals: [],
      reviews: [] as any[]
    }
    const first = buildTrendExcelReport('2026-11-06', '2026-11-06', '2026-11-08',
      profile, sources, { carbohydratesG: null, sugarsG: null, sodiumMg: null }, now)
    // A frozen review must be used by the same calculateDay path as Calendar.
    const original = first[0]!.rows[0]![4] as number
    sources.reviews.push({
      dayKey: '2026-11-06', isComplete: true, markedAt: now,
      frozen: {
        version: 1,
        profile,
        comparisonLimits: { carbohydratesG: null, sugarsG: null, sodiumMg: null },
        summary: {
          dayKey: '2026-11-06',
          intake: {
            entries: 1, foods: 1, beverages: 0,
            nutrients: Object.fromEntries(Object.keys(emptyNutrition()).map(field =>
              [field, { knownAmount: field === 'energyKcal' ? 500 : null,
                knownEntryCount: field === 'energyKcal' ? 1 : 0,
                unknownEntryCount: field === 'energyKcal' ? 0 : 1, totalEntryCount: 1,
                complete: field === 'energyKcal' }])) as never,
            fluids: { knownAmount: null, knownEntryCount: 0, unknownEntryCount: 0, totalEntryCount: 0, complete: false }
          },
          expenditure: {
            restingKcal: 1234, backgroundKcal: 1357, workoutIncrementKcal: 0,
            totalExpenditureKcal: 1357, differenceKcal: -857,
            multiplier: 1.1, weight: { source: 'sameDay', weightKg: 70, sourceDay: '2026-11-06' },
            explanation: []
          },
          activity: {
            dayKey: '2026-11-06', entries: 0, loggedMinutes: null, missingDurationEntries: 0,
            knownIncrementalKcal: null, knownEnergyEntries: 0, unknownEnergyEntries: 0,
            energyCoverageComplete: false
          },
          evaluation: { status: 'incomplete' }, recordedWeightKg: 70, entryCount: 2
        }
      }
    })
    const frozen = buildTrendExcelReport('2026-11-06', '2026-11-06', '2026-11-08',
      profile, sources, { carbohydratesG: null, sugarsG: null, sodiumMg: null }, now)
    expect(original).not.toBe(1234)
    expect(frozen[0]!.rows[0]![4]).toBe(1234)
    expect(frozen[0]!.rows[0]![9]).toBe(1357)
    expect(frozen[0]!.rows[0]![10]).toBe(-857)
  })
})
