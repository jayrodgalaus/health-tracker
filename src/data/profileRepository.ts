import { db, type HealthTrackerDatabase } from '../db/database'
import type { GoalPeriod, Profile } from '../domain/models'
import { assertWeight, validateGoal, validateProfile, type GoalValues, type ProfileValues } from '../domain/profile'
import { toLocalDay } from '../lib/localDate'

export async function readProfile(database: HealthTrackerDatabase = db): Promise<Profile | null> {
  return (await database.profiles.get('primary')) ?? null
}

export async function listGoalPeriods(database: HealthTrackerDatabase = db): Promise<GoalPeriod[]> {
  return database.goalPeriods.orderBy('effectiveFrom').reverse().toArray()
}

export async function readGoalForDay(day: string, database: HealthTrackerDatabase = db): Promise<GoalPeriod | null> {
  return (await database.goalPeriods.where('effectiveFrom').belowOrEqual(day).last()) ?? null
}

/**
 * Create onboarding atomically (including the first weight) or revise settings.
 * Goal history is effective-date based. Saved logs and older goals are untouched.
 * The v1 store keys remain unchanged so existing device records stay readable.
 */
export async function saveProfileAndGoals(
  profileValues: ProfileValues,
  goalValues: GoalValues,
  initialWeightKg: number | null,
  database: HealthTrackerDatabase = db,
  today: string = toLocalDay(new Date())
): Promise<void> {
  validateProfile(profileValues, today)
  const now = new Date().toISOString()
  await database.transaction('rw', database.profiles, database.goalPeriods, database.weightEntries, async () => {
    const prior = await database.profiles.get('primary')
    validateGoal(goalValues, today, Boolean(prior))
    if (profileValues.goal !== goalValues.goalType) throw new Error('Profile and goal selection must agree.')
    if (!prior) {
      if (goalValues.effectiveFrom !== today) throw new Error('The initial goal must start today.')
      if (initialWeightKg === null) throw new Error('An initial weight is required for onboarding.')
      assertWeight(initialWeightKg)
      if (await database.weightEntries.where('dayKey').equals(today).count()) {
        throw new Error('A weight entry already exists for the initial date.')
      }
    } else if (initialWeightKg !== null) {
      throw new Error('Edit your recorded weight from the Log tab, not profile settings.')
    }

    const profile: Profile = {
      id: 'primary',
      birthDate: profileValues.birthDate,
      ageYears: profileValues.ageYears,
      ageAsOf: profileValues.ageAsOf,
      heightCm: profileValues.heightCm,
      sexForEquation: profileValues.sexForEquation,
      activityLevel: profileValues.activityLevel,
      backgroundActivityMultiplier: profileValues.backgroundActivityMultiplier ?? null,
      goal: goalValues.effectiveFrom > today && prior ? prior.goal : profileValues.goal,
      units: profileValues.units,
      createdAt: prior?.createdAt ?? now,
      updatedAt: now
    }
    const sameDate = await database.goalPeriods.where('effectiveFrom').equals(goalValues.effectiveFrom).toArray()
    if (sameDate.length > 1) throw new Error('Multiple goals already exist on this date. No changes were saved.')
    const priorGoal = sameDate[0]
    const goal: GoalPeriod = {
      id: priorGoal?.id ?? crypto.randomUUID(),
      effectiveFrom: goalValues.effectiveFrom,
      goalType: goalValues.goalType,
      targetWeightKg: goalValues.targetWeightKg,
      ruleSettings: goalValues.ruleSettings ?? priorGoal?.ruleSettings,
      targets: { ...goalValues.targets },
      createdAt: priorGoal?.createdAt ?? now
    }
    await database.profiles.put(profile)
    await database.goalPeriods.put(goal)
    if (!prior && initialWeightKg !== null) {
      await database.weightEntries.add({
        id: crypto.randomUUID(),
        dayKey: today,
        recordedAt: now,
        weightKg: initialWeightKg,
        createdAt: now,
        updatedAt: now
      })
    }
  })
}
