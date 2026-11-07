import type { LocalDay, Profile } from './models'
import type { MetricCoverage, NutrientField } from './nutrition'
import { ageOnDay } from './profile'
import { knownAmountPercent } from './nutrientLimits'

/**
 * Philippine Dietary Reference Intakes 2015 (FNRI-DOST; revised Sep 2018).
 * https://fnri.dost.gov.ph/images/images/news/PDRI-2018.pdf
 *
 * This adult-only display comparison is independent of tracking goals and grading.
 * RNI = Recommended Nutrient Intake; AI = Adequate Intake, not a requirement
 * or proof of sufficiency. The FNRI adult fiber AI is a RANGE (20–25 g);
 * using the documented upper end (25 g) produces one reproducible percentage.
 * Only fields with a defensible single numeric daily comparison are shown.
 * In particular, no gram-based RNI for carbs/fat/sugars or an upper sodium
 * target is inferred from AMDRs/AI.
 */
export const PDRI_SOURCE_URL = 'https://fnri.dost.gov.ph/images/images/news/PDRI-2018.pdf'

export interface ReniReference {
  field: NutrientField
  amount: number
  unit: 'g' | 'mg'
  basis: 'RNI' | 'AI'
  /** The reference age, derived for the selected historical day. */
  ageYears: number
  /** Human-readable disclosure for the selected source value. */
  description: string
}

export function reniReferenceForDay(
  field: NutrientField,
  profile: Pick<Profile, 'birthDate' | 'ageYears' | 'ageAsOf' | 'sexForEquation'>,
  dayKey: LocalDay
): ReniReference | null {
  const age = ageOnDay({birthDate:profile.birthDate,ageYears:profile.ageYears??null,ageAsOf:profile.ageAsOf??null},dayKey)
  // The tracker does not provide pediatric reference-based evaluations.
  if (age === null || age < 18 || age > 120) return null
  if (field === 'proteinG') {
    const sex = profile.sexForEquation
    if (sex !== 'male' && sex !== 'female') return null
    const amount = age === 18
      ? (sex === 'male' ? 72 : 61) // PDRI 16–18 year group
      : (sex === 'male' ? 71 : 62) // PDRI adult 19+ groups
    return {
      field, amount, unit: 'g', basis: 'RNI', ageYears: age,
      description: `Protein RNI ${amount} g/day; ${sex} reference, age ${age}`
    }
  }
  if (field === 'fiberG') {
    const amount = age === 18 ? 23 : 25
    return {
      field, amount, unit: 'g', basis: 'AI', ageYears: age,
      description: `Fiber AI comparison ${amount} g/day (upper end of the ${age===18?'21–23':'20–25'} g/day range); age ${age}`
    }
  }
  if (field === 'potassiumMg') return {
    field, amount: 2000, unit: 'mg', basis: 'AI', ageYears: age,
    description: `Potassium AI comparison 2,000 mg/day; age ${age}`
  }
  // Sodium's 500 mg AI is not an upper limit. Do not present a high percentage
  // as a positive accomplishment or substitute it for a configured sodium goal.
  return null
}

/**
 * Percentage of the *known* recorded amount against a valid daily reference.
 * For incomplete nutrient coverage, this is only a lower bound. The caller
 * must label it accordingly; missing values are never counted as zero.
 */
export function reniPercent(metric: MetricCoverage, reference: ReniReference | null): number | null {
  return knownAmountPercent(metric, reference?.amount ?? null)
}
