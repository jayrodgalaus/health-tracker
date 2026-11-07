import { describe, expect, it } from 'vitest'
import { DISPLAY_NUTRIENT_FIELDS, formatEntryNutrient, isDisplayNutrientField } from './nutrientDisplay'

describe('Calendar nutrient entry formatting', () => {
  it('recognizes only the seven nutrient fields shown on the cards', () => {
    expect(DISPLAY_NUTRIENT_FIELDS).toHaveLength(7)
    expect(DISPLAY_NUTRIENT_FIELDS.every(isDisplayNutrientField)).toBe(true)
    expect(isDisplayNutrientField('energyKcal')).toBe(false)
    expect(isDisplayNutrientField('saturatedFatG')).toBe(false)
    expect(isDisplayNutrientField('constructor')).toBe(false)
    expect(isDisplayNutrientField(undefined)).toBe(false)
  })

  it('shows a dash for unknown null and legacy missing potassium without substituting zero', () => {
    expect(formatEntryNutrient(null, 'proteinG')).toBe('-')
    expect(formatEntryNutrient(undefined, 'potassiumMg')).toBe('-')
    expect(formatEntryNutrient(0, 'proteinG')).toBe('0 g')
    expect(formatEntryNutrient(0, 'sodiumMg')).toBe('0 mg')
  })

  it('uses the consumed nutrient snapshot units and rounds only in display', () => {
    expect(formatEntryNutrient(49.1, 'proteinG')).toBe('49.1 g')
    expect(formatEntryNutrient(1289.75, 'sodiumMg')).toBe('1,289.8 mg')
    expect(formatEntryNutrient(15.5, 'sugarsG')).toBe('15.5 g')
  })
})
