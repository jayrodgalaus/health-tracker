import type { AppSettings, DayReview, ExerciseEntry, FoodEntry, GoalPeriod, Profile, WeightEntry } from './models'
import { calculateDay, goalOnDay } from './evaluation'

/** Canonical frozen completion record for new completions and legacy migrations. */
export function archiveCompletedDay(
  review: DayReview,
  profile: Profile,
  sources: {
    intake: readonly FoodEntry[]
    activities: readonly ExerciseEntry[]
    weights: readonly WeightEntry[]
    goals: readonly GoalPeriod[]
    settings?: AppSettings | null
  },
  calculatedAt: string
): DayReview {
  if (!review.isComplete) throw new Error('Only completed days can be archived.')
  const dayKey = review.dayKey
  const activeReview: DayReview = { ...review, frozen: undefined }
  // Never use a prior snapshot when explicitly completing again.
  const summary = calculateDay({
    dayKey, profile, goal: goalOnDay(dayKey, sources.goals),
    weights: sources.weights, intake: sources.intake.filter(entry => entry.dayKey === dayKey),
    activities: sources.activities.filter(entry => entry.dayKey === dayKey), review: activeReview
  }, calculatedAt)
  return {
    ...review,
    frozen: {
      version: 1,
      summary,
      profile: structuredClone(profile),
      comparisonLimits: {
        carbohydratesG: sources.settings?.carbohydrateLimitG ?? null,
        sugarsG: sources.settings?.sugarLimitG ?? null,
        sodiumMg: sources.settings?.sodiumLimitMg ?? null
      }
    }
  }
}

/**
 * Older completed reviews lack a snapshot. Capture the best currently available
 * state once, without fabricating missing logs or original completion-time goals.
 * Snapshots already present are NEVER recomputed or overwritten.
 */
export function archiveLegacyReviews(
  reviews: readonly DayReview[], profile: Profile | null,
  sources: Parameters<typeof archiveCompletedDay>[2],
  at: string
): DayReview[] {
  if (!profile) return [...reviews]
  return reviews.map(review => review.isComplete && !review.frozen
    ? archiveCompletedDay(review, profile, sources, review.markedAt ?? at)
    : review)
}
