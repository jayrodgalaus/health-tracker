/** The five-hundred-millisecond radar intro moves from the chart origin clockwise. */
export const RADAR_ANIMATION_MS = 500

/** Delay the first-to-last node by 300ms; each node then has 200ms to travel. */
const STAGGER_MS = 300

/**
 * Pure animation geometry. (0,0) is the radar's radial origin (its SVG center).
 * Unknown scores stay null rather than being animated as measured zeros.
 */
export function animatedRadarFraction(
  score: number | null,
  index: number,
  count: number,
  elapsedMs: number
): number | null {
  if (score === null || !Number.isFinite(score)) return null

  const delay = count > 1 ? STAGGER_MS * index / (count - 1) : 0
  const travelMs = count > 1 ? RADAR_ANIMATION_MS - STAGGER_MS : RADAR_ANIMATION_MS
  const progress = Math.max(0, Math.min(1, (elapsedMs - delay) / travelMs))
  const eased = 1 - (1 - progress) ** 3
  return Math.max(0, Math.min(100, score)) / 100 * eased
}
