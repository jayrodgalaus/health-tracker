import type { ExerciseEntry, FoodEntry, Profile, WeightEntry } from './models'
import { calculateDay, goalOnDay } from './evaluation'
import { estimateWorkout } from './activity'
import { ageOnDay } from './profile'
import { NUTRIENT_FIELDS, isPlainWaterEntry, type MetricCoverage, type NutrientField } from './nutrition'
import { reniReferenceForDay } from './reni'
import { knownAmountPercent, type NutrientComparisonLimits } from './nutrientLimits'
import { trendDays, type TrendSources } from './trends'

export type ExcelValue = string | number | null
export interface ExcelColumn {
  header: string
  width?: number
  type?: 'date' | 'number' | 'text'
}
export interface ExcelSheet {
  name: string
  columns: ExcelColumn[]
  rows: ExcelValue[][]
}

const nutrientMeta: Record<NutrientField, { name: string; unit: string }> = {
  energyKcal: { name: 'Calories', unit: 'kcal' },
  proteinG: { name: 'Protein', unit: 'g' },
  carbohydratesG: { name: 'Carbohydrates', unit: 'g' },
  fatG: { name: 'Fat', unit: 'g' },
  saturatedFatG: { name: 'Saturated fat', unit: 'g' },
  fiberG: { name: 'Fiber', unit: 'g' },
  sugarsG: { name: 'Sugars', unit: 'g' },
  sodiumMg: { name: 'Sodium', unit: 'mg' },
  potassiumMg: { name: 'Potassium', unit: 'mg' }
}
const references = [
  { field: 'proteinG', label: 'Protein RNI', basis: 'RNI' },
  { field: 'fiberG', label: 'Fiber AI', basis: 'AI' },
  { field: 'potassiumMg', label: 'Potassium AI', basis: 'AI' },
  { field: 'carbohydratesG', label: 'User carbs limit', basis: 'User limit' },
  { field: 'sugarsG', label: 'User sugars limit', basis: 'User limit' },
  { field: 'sodiumMg', label: 'User sodium limit', basis: 'User limit' }
] as const

function coverage(metric: MetricCoverage): string {
  if (metric.totalEntryCount === 0) return 'Not recorded'
  if (metric.knownEntryCount === 0) return 'Unknown (0/' + metric.totalEntryCount + ')'
  return (metric.complete ? 'Complete' : 'Partial') +
    ' (' + metric.knownEntryCount + '/' + metric.totalEntryCount + ')'
}

function byDate<T extends { dayKey: string }>(records: readonly T[], start: string, end: string): T[] {
  return records.filter(entry => entry.dayKey >= start && entry.dayKey <= end)
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}

function numeric(value: number | null | undefined): number | null {
  return value === undefined || value === null || !Number.isFinite(value) ? null : value
}

const col = (header: string, width = 19, type: ExcelColumn['type'] = 'number'): ExcelColumn =>
  ({ header, width, type })

/**
 * One date per row on the four main tabs, using the same calculations as
 * Calendar's Energy/Nutrition/Fluids/Weight pages. All other tabs are details,
 * never an alternative calculation or a replacement for the IndexedDB records.
 */
export function buildTrendExcelReport(
  start: string,
  end: string,
  today: string,
  profile: Profile,
  sources: TrendSources,
  limits: NutrientComparisonLimits,
  calculatedAt: string
): ExcelSheet[] {
  const dates = trendDays(start, end, today)
  const selectedIntake = byDate(sources.intake, start, end)
  const selectedActivities = byDate(sources.activities, start, end)
  const selectedWeights = byDate(sources.weights, start, end)
  const reviews = new Map(sources.reviews.map(entry => [entry.dayKey, entry]))

  const energy: ExcelSheet = {
    name: 'Energy',
    columns: [
      col('Date', 15, 'date'), col('Day status', 17, 'text'),
      col('Calories consumed (kcal)'), col('Calories coverage', 24, 'text'),
      col('Resting estimate (kcal)'), col('Non-workout background (kcal)'),
      col('Background multiplier'), col('Additional workout (kcal)'),
      col('Workout coverage', 22, 'text'), col('Total expended estimate (kcal)'),
      col('Difference: consumed - expended (kcal)', 27),
      col('Weight used for estimate (kg)'), col('Weight source', 21, 'text'),
      col('Weight source date', 20, 'date')
    ],
    rows: []
  }
  const nutrition: ExcelSheet = {
    name: 'Nutrition',
    columns: [
      col('Date', 15, 'date'), col('Day status', 17, 'text'),
      col('Food entries'), col('Other drink entries')
    ],
    rows: []
  }
  for (const field of NUTRIENT_FIELDS) {
    const meta = nutrientMeta[field]
    nutrition.columns.push(col(meta.name + ' (' + meta.unit + ')', 21))
    nutrition.columns.push(col(meta.name + ' coverage', 24, 'text'))
  }
  for (const item of references) {
    const meta = nutrientMeta[item.field]
    nutrition.columns.push(col(item.label + ' (' + meta.unit + ')', 23))
    nutrition.columns.push(col(item.label + ' (%)', 19))
  }

  const fluids: ExcelSheet = {
    name: 'Logged Fluids',
    columns: [
      col('Date', 15, 'date'), col('Day status', 17, 'text'),
      col('Logged fluids (ml)'), col('Fluid coverage', 24, 'text'),
      col('Drink and water entries'), col('Known-volume entries'),
      col('Unknown-volume entries')
    ],
    rows: []
  }
  const weights: ExcelSheet = {
    name: 'Weight Records',
    columns: [
      col('Date', 15, 'date'), col('Day status', 17, 'text'),
      col('Actual measured weight (kg)'), col('Measurement recorded at (UTC)', 26, 'text'),
      col('Actual measurement records'), col('Earlier/current weight used for energy (kg)'),
      col('Energy weight source', 21, 'text'), col('Energy weight source date', 23, 'date')
    ],
    rows: []
  }

  for (const day of dates) {
    const dayIntake = selectedIntake.filter(entry => entry.dayKey === day)
    const dayActivities = selectedActivities.filter(entry => entry.dayKey === day)
    const dayWeights = selectedWeights.filter(entry => entry.dayKey === day)
    const review = reviews.get(day) ?? null
    const locked = review?.isComplete === true
    const frozen = locked && review?.frozen?.version === 1 ? review.frozen : null
    const historicalProfile = frozen?.profile ?? profile
    const historicalLimits = frozen?.comparisonLimits ?? limits
    const summary = calculateDay({
      dayKey: day, profile, weights: sources.weights, intake: dayIntake,
      activities: dayActivities, goal: goalOnDay(day, sources.goals), review
    }, calculatedAt)
    const calorie = summary.intake.nutrients.energyKcal
    const exp = summary.expenditure
    const act = summary.activity
    const fluid = summary.intake.fluids
    const dayStatus = locked ? 'Completed' : 'Open / incomplete'

    energy.rows.push([
      day, dayStatus, numeric(calorie.knownAmount), coverage(calorie),
      numeric(exp.restingKcal), numeric(exp.backgroundKcal), numeric(exp.multiplier),
      numeric(exp.workoutIncrementKcal),
      act.entries === 0 ? (locked ? 'No workouts (completed)' : 'Not recorded')
        : (act.energyCoverageComplete ? 'Complete' : 'Partial') +
          ' (' + act.knownEnergyEntries + '/' + act.entries + ')',
      numeric(exp.totalExpenditureKcal), numeric(exp.differenceKcal),
      numeric(exp.weight.weightKg), exp.weight.source,
      exp.weight.sourceDay
    ])
    const nutrientRow: ExcelValue[] = [
      day, dayStatus, summary.intake.foods,
      dayIntake.filter(entry => entry.kind === 'beverage' && !isPlainWaterEntry(entry)).length
    ]
    for (const field of NUTRIENT_FIELDS) {
      const metric = summary.intake.nutrients[field]
      nutrientRow.push(numeric(metric.knownAmount), coverage(metric))
    }
    for (const item of references) {
      const metric = summary.intake.nutrients[item.field]
      const ref = item.basis === 'User limit'
        ? item.field === 'carbohydratesG' ? historicalLimits.carbohydratesG
          : item.field === 'sugarsG' ? historicalLimits.sugarsG : historicalLimits.sodiumMg
        : reniReferenceForDay(item.field, historicalProfile, day)?.amount ?? null
      nutrientRow.push(ref, knownAmountPercent(metric, ref))
    }
    nutrition.rows.push(nutrientRow)

    fluids.rows.push([
      day, dayStatus, numeric(fluid.knownAmount), coverage(fluid),
      fluid.totalEntryCount, fluid.knownEntryCount, fluid.unknownEntryCount
    ])
    weights.rows.push([
      day, dayStatus, numeric(summary.recordedWeightKg),
      dayWeights.length === 1 ? dayWeights[0]?.recordedAt ?? null : null,
      dayWeights.length, numeric(exp.weight.weightKg),
      exp.weight.source, exp.weight.sourceDay
    ])
  }

  const foodDetails: ExcelSheet = {
    name: 'Food & Drink Entries',
    columns: [
      col('Date', 15, 'date'), col('Type', 15, 'text'), col('Name', 35, 'text'),
      col('Meal', 16, 'text'), col('Quantity'), col('Unit', 15, 'text'),
      col('Label reference quantity'), col('Label reference unit', 21, 'text'),
      col('Serving description', 27, 'text'), col('Fluid (ml)')
    ],
    rows: []
  }
  for (const field of NUTRIENT_FIELDS) {
    const meta = nutrientMeta[field]
    foodDetails.columns.push(col(meta.name + ' (' + meta.unit + ')', 21))
  }
  foodDetails.columns.push(col('Recorded at (UTC)', 26, 'text'))
  for (const entry of selectedIntake) {
    const water = isPlainWaterEntry(entry)
    foodDetails.rows.push([
      entry.dayKey, water ? 'Water' : entry.kind === 'food' ? 'Food' : 'Drink',
      entry.name, entry.meal ?? null, entry.quantity, entry.unit,
      entry.labelBasis.quantity, entry.labelBasis.unit,
      entry.servingDescription ?? null, numeric(entry.fluidMl),
      ...NUTRIENT_FIELDS.map(field => water ? null : numeric(entry.nutrientsSnapshot[field])),
      entry.recordedAt
    ])
  }
  const fluidDetails: ExcelSheet = {
    name: 'Fluid Entries',
    columns: [
      col('Date', 15, 'date'), col('Drink name', 32, 'text'),
      col('Drink type', 18, 'text'), col('Quantity'), col('Unit', 15, 'text'),
      col('Logged fluid (ml)'), col('Drink calories (kcal)'),
      col('Recorded at (UTC)', 26, 'text')
    ],
    rows: selectedIntake.filter(entry => entry.kind === 'beverage').map(entry => [
      entry.dayKey, entry.name, isPlainWaterEntry(entry) ? 'Plain water' : 'Other drink',
      entry.quantity, entry.unit, numeric(entry.fluidMl),
      isPlainWaterEntry(entry) ? 0 : numeric(entry.nutrientsSnapshot.energyKcal),
      entry.recordedAt
    ])
  }
  const workouts: ExcelSheet = {
    name: 'Exercise Entries',
    columns: [
      col('Date', 15, 'date'), col('Activity', 27, 'text'),
      col('Duration (min)'), col('Distance (km)'), col('Speed (km/h)'),
      col('Incline (%)'), col('Energy method', 23, 'text'),
      col('Net workout estimate (kcal)'), col('Estimate explanation', 60, 'text'),
      col('Notes', 40, 'text'), col('Recorded at (UTC)', 26, 'text')
    ],
    rows: selectedActivities.map((entry: ExerciseEntry) => {
      const frozen = reviews.get(entry.dayKey)?.frozen
      const p = frozen?.profile ?? profile
      const age = ageOnDay({
        birthDate: p.birthDate, ageYears: p.ageYears ?? null, ageAsOf: p.ageAsOf ?? null
      }, entry.dayKey)
      const estimate = estimateWorkout(entry, sources.weights, age !== null && age >= 18)
      return [
        entry.dayKey, entry.activity, numeric(entry.durationMinutes),
        numeric(entry.distanceKm), numeric(entry.speedKmh), numeric(entry.inclinePercent),
        estimate.method, numeric(estimate.kcal), estimate.explanation,
        entry.notes ?? null, entry.startedAt
      ]
    })
  }
  const weightDetails: ExcelSheet = {
    name: 'Weight Entries',
    columns: [
      col('Date', 15, 'date'), col('Measured weight (kg)'),
      col('Recorded at (UTC)', 26, 'text'), col('Updated at (UTC)', 26, 'text')
    ],
    rows: selectedWeights.map((entry: WeightEntry) => [
      entry.dayKey, entry.weightKg, entry.recordedAt, entry.updatedAt
    ])
  }
  const about: ExcelSheet = {
    name: 'Report Info',
    columns: [col('Field', 31, 'text'), col('Value', 104, 'text')],
    rows: [
      ['Report', 'Personal Health Tracker — per-day local export'],
      ['Start (inclusive)', start],
      ['End (inclusive)', end],
      ['Exported at (UTC)', calculatedAt],
      ['Data source', 'Locally stored IndexedDB records only; no health data is uploaded.'],
      ['Main sheets', 'Energy, Nutrition, Logged Fluids, Weight Records each have one row for every selected calendar day.'],
      ['Missing values', 'Blank cells mean unknown, not recorded, or not assessable; numeric zero means a recorded/calculated zero.'],
      ['Partial totals', 'Coverage columns identify known values and entries with missing information. Partial known totals are lower bounds.'],
      ['Energy', 'Resting/background/active/total kcal and consumed minus expended are estimates, not measured or weight-change predictions.'],
      ['Weight', 'Actual measured weight is only populated on a measurement date. Prior weight used in estimates is separate.'],
      ['Daily completion', 'Previously completed days use their archived calculation snapshot. Open days may show provisional estimates.'],
      ['Nutrition', 'Reported nutrient totals exclude plain water. Caloric drinks are counted once for nutrients and separately once for fluid volume.'],
      ['References', 'Where available, RNI/AI percentages use the historical FNRI adult reference; user limits are distinct and are not clinical targets.'],
      ['Confidentiality', 'This Excel workbook contains personal health records. Save it securely; Excel files are not encrypted by this export.']
    ]
  }
  return [energy, nutrition, fluids, weights, foodDetails, fluidDetails, workouts, weightDetails, about]
}
