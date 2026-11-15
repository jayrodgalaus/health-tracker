import { db, type HealthTrackerDatabase } from '../db/database'
import { assertDayEditable } from './dayRepository'
import type { FoodEntry, KitchenRecipe, LabelBasis, LocalDay, MealCategory, NutrientFieldName, NutrientSnapshot, NutritionSource, SavedFood, ServingUnit } from '../domain/models'
import { validateIncompleteNutrients, validateKitchenRecipe } from '../domain/kitchenRecipe'
import {
  emptyNutrition, fluidMlFromPortion, portionRatioWithServing, scaleNutrition,
  validateNutrition, validatePortion, waterNutrition
} from '../domain/nutrition'
import { assertLocalDay } from '../domain/profile'
import { toLocalDay } from '../lib/localDate'

export interface FoodDefinition {
  name: string
  brand?: string | null
  kind: 'food' | 'beverage'
  servingDescription?: string | null
  labelBasis: LabelBasis
  referenceNutrients: NutrientSnapshot
  fluidMlPerBasis?: number | null
  isFavorite?: boolean
  recipe?: KitchenRecipe
  incompleteNutrientFields?: NutrientFieldName[]
}

export interface IntakeDraft {
  dayKey: LocalDay
  kind: 'food' | 'beverage'
  beverageType?: 'water' | 'other'
  meal?: MealCategory | null
  name: string
  savedFoodId?: string | null
  quantity: number
  unit: ServingUnit
  labelBasis: LabelBasis
  referenceNutrients: NutrientSnapshot
  nutritionSource?: NutritionSource | null
  servingDescription?: string | null
  incompleteNutrientFields?: NutrientFieldName[]
  /** Frozen grams or milliliters per serving when logging a batch by servings. */
  servingAmount?: LabelBasis | null
  /** Required only when volume cannot be derived from consumed amount units. */
  fluidMl?: number | null
}

function validName(name: string): string {
  const normalized = name.trim()
  if (!normalized || normalized.length > 150) throw new Error('Enter a name up to 150 characters.')
  return normalized
}

function validOptionalText(input: string | null | undefined, limit = 150): string | null {
  if (!input?.trim()) return null
  if (input.trim().length > limit) throw new Error('Text is too long.')
  return input.trim()
}

function validateFluid(value: number | null | undefined): void {
  if (value === null || value === undefined) return
  if (!Number.isFinite(value) || value < 0 || value > 30000) {
    throw new Error('Fluid volume must be between 0 and 30,000 ml.')
  }
}

function validateDefinition(definition: FoodDefinition): void {
  validName(definition.name)
  if (definition.kind !== 'food' && definition.kind !== 'beverage') throw new Error('Choose food or beverage.')
  validOptionalText(definition.brand)
  validOptionalText(definition.servingDescription)
  validatePortion(definition.labelBasis.quantity, definition.labelBasis.unit)
  validateNutrition(definition.referenceNutrients)
  validateIncompleteNutrients(definition.incompleteNutrientFields, definition.referenceNutrients)
  if (definition.recipe) validateKitchenRecipe(definition.recipe, definition.labelBasis)
  validateFluid(definition.fluidMlPerBasis)
  if (definition.kind === 'food' && definition.fluidMlPerBasis != null) {
    throw new Error('Fluid tracking applies to beverages, not food.')
  }
}

function validateDate(dayKey: LocalDay, today: LocalDay): void {
  assertLocalDay(dayKey, 'Entry date')
  if (dayKey > today) throw new Error('Future entries are not supported.')
}

function prepareEntry(draft: IntakeDraft, previous: FoodEntry | undefined, today: LocalDay): FoodEntry {
  validateDate(draft.dayKey, today)
  const name = validName(draft.name)
  validatePortion(draft.quantity, draft.unit)
  validatePortion(draft.labelBasis.quantity, draft.labelBasis.unit)
  if (draft.kind !== 'food' && draft.kind !== 'beverage') throw new Error('Choose food or beverage.')
  if (draft.meal != null && !['breakfast', 'lunch', 'dinner', 'snack'].includes(draft.meal)) {
    throw new Error('Unknown meal category.')
  }
  if (draft.beverageType === 'water') {
    if (draft.kind !== 'beverage') throw new Error('Water must be recorded as a beverage.')
    if (draft.unit !== 'ml' && draft.unit !== 'fl-oz') throw new Error('Water requires a measured volume.')
    if (draft.referenceNutrients.energyKcal !== 0) throw new Error('Plain water must have zero known calories.')
  }
  const scaled = scaleNutrition(
    draft.referenceNutrients, draft.labelBasis, draft.quantity, draft.unit, draft.servingAmount
  )
  validateNutrition(scaled)
  validateIncompleteNutrients(draft.incompleteNutrientFields, scaled)
  validateFluid(draft.fluidMl)
  const autoVolume = draft.kind === 'beverage' ? fluidMlFromPortion(draft.quantity, draft.unit) : null
  const fluidMl = draft.kind === 'beverage' ? autoVolume ?? draft.fluidMl ?? null : null
  validateFluid(fluidMl)
  const now = new Date().toISOString()
  return {
    id: previous?.id ?? crypto.randomUUID(),
    dayKey: draft.dayKey,
    recordedAt: previous?.recordedAt ?? now,
    kind: draft.kind,
    ...(draft.kind === 'beverage' ? { beverageType: draft.beverageType ?? 'other' } : {}),
    meal: draft.kind === 'food' ? draft.meal ?? null : null,
    name,
    savedFoodId: draft.savedFoodId ?? null,
    quantity: draft.quantity,
    unit: draft.unit,
    labelBasis: { ...draft.labelBasis },
    servingDescription: validOptionalText(draft.servingDescription),
    referenceNutrientsSnapshot: { ...emptyNutrition(), ...draft.referenceNutrients },
    ...(draft.unit === 'serving' && draft.servingAmount
      ? { servingAmount: { ...draft.servingAmount } } : {}),
    nutritionSource: draft.nutritionSource ?? null,
    nutrientsSnapshot: scaled,
    ...(draft.incompleteNutrientFields?.length
      ? { incompleteNutrientFields: [...draft.incompleteNutrientFields] } : {}),
    fluidMl,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now
  }
}

export async function listSavedFoods(database: HealthTrackerDatabase = db): Promise<SavedFood[]> {
  const foods = await database.savedFoods.toArray()
  return foods.sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)) || a.name.localeCompare(b.name))
}

export async function saveSavedFood(
  definition: FoodDefinition,
  id?: string,
  database: HealthTrackerDatabase = db
): Promise<SavedFood> {
  validateDefinition(definition)
  return database.transaction('rw', database.savedFoods, async () => {
    const existing = id ? await database.savedFoods.get(id) : undefined
    if (id && !existing) throw new Error('The saved item no longer exists.')
    const now = new Date().toISOString()
    const sameBasis = existing?.labelBasis.quantity === definition.labelBasis.quantity &&
      existing.labelBasis.unit === definition.labelBasis.unit
    const sameNutrients = existing && Object.keys(emptyNutrition()).every(field =>
      (existing.nutrientsPerBasis[field as NutrientFieldName] ?? null) ===
      (definition.referenceNutrients[field as NutrientFieldName] ?? null))
    // Editing an unrelated label must not leave stale ingredient provenance.
    const recipe = definition.recipe ?? (sameBasis && sameNutrients ? existing?.recipe : undefined)
    // Keep still-applicable incomplete markers when manually editing a single field.
    const incomplete = definition.incompleteNutrientFields ?? existing?.incompleteNutrientFields?.filter(field =>
      (existing.nutrientsPerBasis[field] ?? null) === (definition.referenceNutrients[field] ?? null))
    if (recipe) validateKitchenRecipe(recipe, definition.labelBasis)
    validateIncompleteNutrients(incomplete, definition.referenceNutrients)
    const saved: SavedFood = {
      id: existing?.id ?? crypto.randomUUID(),
      name: validName(definition.name),
      brand: validOptionalText(definition.brand),
      kind: definition.kind,
      servingDescription: validOptionalText(definition.servingDescription),
      labelBasis: { ...definition.labelBasis },
      nutrientsPerBasis: { ...emptyNutrition(), ...definition.referenceNutrients },
      ...(incomplete?.length ? { incompleteNutrientFields: [...incomplete] } : {}),
      ...(recipe ? { recipe: structuredClone(recipe) } : {}),
      fluidMlPerBasis: definition.kind === 'beverage' ? definition.fluidMlPerBasis ?? null : null,
      isFavorite: definition.isFavorite ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    await database.savedFoods.put(saved)
    return saved
  })
}

/** Deleting a reusable label never deletes or changes already logged portions. */
export async function deleteSavedFood(id: string, database: HealthTrackerDatabase = db): Promise<void> {
  await database.savedFoods.delete(id)
}

export async function listIntakeForDay(dayKey: LocalDay, database: HealthTrackerDatabase = db): Promise<FoodEntry[]> {
  assertLocalDay(dayKey)
  return database.foodEntries.where('dayKey').equals(dayKey).sortBy('recordedAt')
}

export async function listRecentIntake(database: HealthTrackerDatabase = db): Promise<FoodEntry[]> {
  return database.foodEntries.orderBy('recordedAt').reverse().limit(12).toArray()
}

/** A change to any intake entry recomputes UI totals via Dexie's live query. */
export async function saveIntake(
  draft: IntakeDraft,
  id?: string,
  database: HealthTrackerDatabase = db,
  today: LocalDay = toLocalDay(new Date())
): Promise<FoodEntry> {
  // Validate before writing; a single entry update is also atomic.
  return database.transaction('rw', database.foodEntries, database.dayReviews, async () => {
    const previous = id ? await database.foodEntries.get(id) : undefined
    if (id && !previous) throw new Error('This entry no longer exists.')
    const entry = prepareEntry(draft, previous, today)
    await assertDayEditable(entry.dayKey, database)
    if (previous && previous.dayKey !== entry.dayKey) await assertDayEditable(previous.dayKey, database)
    await database.foodEntries.put(entry)
    return entry
  })
}

/**
 * Copy saved reference nutrition/label immediately into a new historical entry.
 * Updates to that product never alter the new entry's recorded snapshot.
 */
export async function logSavedFood(
  id: string,
  dayKey: LocalDay,
  quantity: number,
  unit: ServingUnit,
  meal: MealCategory | null = null,
  database: HealthTrackerDatabase = db,
  today: LocalDay = toLocalDay(new Date())
): Promise<FoodEntry> {
  const saved = await database.savedFoods.get(id)
  if (!saved) throw new Error('This saved food no longer exists.')
  const servingAmount = saved.recipe?.finishedAmount && saved.recipe.servingCount
    ? { quantity: saved.recipe.finishedAmount.quantity / saved.recipe.servingCount,
        unit: saved.recipe.finishedAmount.unit }
    : null
  const ratio = portionRatioWithServing(saved.labelBasis, quantity, unit, servingAmount)
  const volume = saved.kind === 'beverage' && saved.fluidMlPerBasis != null
    ? saved.fluidMlPerBasis * ratio
    : null
  return saveIntake({
    dayKey,
    kind: saved.kind ?? 'food',
    name: saved.name,
    savedFoodId: id,
    meal,
    quantity,
    unit,
    labelBasis: { ...saved.labelBasis },
    servingDescription: saved.servingDescription,
    referenceNutrients: { ...saved.nutrientsPerBasis },
    incompleteNutrientFields: saved.incompleteNutrientFields,
    servingAmount: unit === 'serving' ? servingAmount : null,
    fluidMl: volume
  }, undefined, database, today)
}

export async function saveWater(
  dayKey: LocalDay,
  volumeMl: number,
  id?: string,
  database: HealthTrackerDatabase = db,
  today: LocalDay = toLocalDay(new Date())
): Promise<FoodEntry> {
  return saveIntake({
    dayKey,
    kind: 'beverage',
    beverageType: 'water',
    name: 'Water',
    savedFoodId: null,
    quantity: volumeMl,
    unit: 'ml',
    labelBasis: { quantity: 1, unit: 'ml' },
    referenceNutrients: waterNutrition(),
    fluidMl: volumeMl
  }, id, database, today)
}

export async function deleteIntake(id: string, database: HealthTrackerDatabase = db): Promise<void> {
  await database.transaction('rw', database.foodEntries, database.dayReviews, async () => {
    const prior = await database.foodEntries.get(id)
    if (prior) {
      await assertDayEditable(prior.dayKey, database)
      await database.foodEntries.delete(id)
    }
  })
}
