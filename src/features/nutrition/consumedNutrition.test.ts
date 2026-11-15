import { describe, expect, it } from 'vitest'
import { emptyNutrition } from '../../domain/nutrition'
import { inputsFromNutrition, nutritionFromInputs } from './NutritionFields'
import { consumedNutritionInputs, referenceValueFromConsumedInput } from './consumedNutrition'

const basis = { quantity: 100, unit: 'g' as const }
const reference = inputsFromNutrition({
  ...emptyNutrition(), energyKcal: 23, proteinG: 1.27, sodiumMg: 8
})

describe('live USDA nutrition for consumed amount', () => {
  it('scales every reported nutrient when the consumed mass changes', () => {
    expect(consumedNutritionInputs(reference, basis, '100', 'g')).toMatchObject({
      energyKcal: '23', proteinG: '1.27', sodiumMg: '8'
    })
    expect(consumedNutritionInputs(reference, basis, '75', 'g')).toMatchObject({
      energyKcal: '17.25', proteinG: '0.9525', sodiumMg: '6'
    })
    expect(consumedNutritionInputs(reference, basis, '50', 'g')).toMatchObject({
      energyKcal: '11.5', proteinG: '0.635', sodiumMg: '4'
    })
    expect(consumedNutritionInputs(reference, basis, '1', 'oz').energyKcal)
      .toBe(String(Number((23 * 28.349523125 / 100).toPrecision(12))))
  })
  it('does not turn unreported USDA nutrients into measured zero', () => {
    const values = consumedNutritionInputs(reference, basis, '75', 'g')
    expect(values.sugarsG).toBe('')
    expect(values.potassiumMg).toBe('')
    expect(consumedNutritionInputs(reference, basis, '', 'g').energyKcal).toBe('')
    expect(consumedNutritionInputs(reference, basis, '0', 'g').proteinG).toBe('')
    expect(consumedNutritionInputs(reference, basis, '100', 'serving').energyKcal).toBe('')
  })
  it('converts a user-corrected consumed amount back to the original 100g label', () => {
    const newValue = referenceValueFromConsumedInput('20', basis, 50, 'g')
    expect(newValue).toBe('40')
    const corrected = { ...reference, energyKcal: newValue }
    expect(nutritionFromInputs(corrected).energyKcal).toBe(40)
    expect(consumedNutritionInputs(corrected, basis, '50', 'g').energyKcal).toBe('20')
    expect(consumedNutritionInputs(corrected, basis, '25', 'g').energyKcal).toBe('10')
    expect(referenceValueFromConsumedInput('', basis, 50, 'g')).toBe('')
    expect(() => referenceValueFromConsumedInput('10', basis, 1, 'piece'))
      .toThrow(/Cannot convert/)
  })
})
