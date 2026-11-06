# Health Tracker v1 — evaluation rules and energy assumptions

This document describes the first-phase-2 implementation of the
*Personal Health Tracker — Development Guide v1.0*, §§2, 4.3, 4.8, 6.1–6.9.
These bands are **product tracking heuristics**, not medically validated thresholds,
nutritional recommendations, diagnoses, or exercise prescriptions.

## Eligibility and status

Every day is read from IndexedDB raw records via `readDayRecords()` or a batched
`readMonthRecords()`, then evaluated by the **same pure** `calculateDay()` in
`src/domain/evaluation.ts`. There are no persisted daily scores.

A day may be scored only when all are true:

1. The user explicitly marked it complete via `dayReviews.isComplete`.
2. Adult applicability (age at that historical local date is ≥18) is known.
3. A historical goal with at least one supported daily tracking target applies.
4. Every configured, supported target has fully known relevant logged entries.
   Energy needs at least one non-water food/drink entry with fully known calories;
   water-only logs cannot establish complete meal intake.
5. All mandatory values are finite and valid.

Otherwise status is **incomplete**. An unmarked day can show provisional rules
for an adult, but is never assigned a positive or negative overall result. For
minors or unknown adult age, even provisional adult goal judgments are withheld.

Supported **daily rule targets** are user-entered calories, protein, fiber,
fluid and an optional *upper tracking* sodium amount; unspecified targets are
not evaluated. Exercise is summarized on a Monday–Sunday weekly basis and
does not make a rest day fail; weight trends do not score daily health.

## Rule defaults and settings

Rule version: **1.0.0**. Settings exposes these *effective-dated* rule bands
under the corresponding goal revision; prior goal periods remain unchanged.

| Tracked metric | Aligned | Attention | Large deviation |
| --- | --- | --- | --- |
| Calories consumed vs selected kcal target | absolute difference ≤15% | >15% through 30% | >30% |
| Protein, fiber or logged fluid vs chosen minimum | actual ≥100% target | ≥50% and <100% | <50% |
| Sodium vs selected upper tracking limit | actual ≤limit | above limit through 30% | >30% above limit |

Energy's aligned/large-deviation bands and minimum/sodium severe-deviation
thresholds are user-editable. Valid inputs: energy alignment 5–30%,
energy significant deviation >aligned and 15–60%, minimum large
deviation 10–80% of target, sodium large deviation 10–70% above limit.
These are descriptive tracking bands, **not** instructions to consume or burn
specific amounts. A zero allowed minimum is trivially aligned only when its
value is known; unknown is never zero.

For completed assessable days: all aligned = **onTarget**, at least one
attention and no large deviation = **mixed**, any large deviation = **offTarget**.
Each rule includes its code, recorded value, chosen target, units, whether
assessable and a human-readable explanation. If any configured rule lacks
complete evidence, the overall status is **incomplete**—not off-target.

## Optional expenditure calculation

Only for a confirmed adult date with required inputs:

- Mifflin–St Jeor **estimated resting kcal/day** =
  `10 × recordedKg + 6.25 × heightCm − 5 × ageYears + constant`,
  where the explicitly selected equation constant is +5 or −161.
- Settings provides an **optional movement dropdown** with explicit, descriptive
  non-workout ranges: resting-only (×1.00), mostly seated (×1.01–1.10,
  uses ×1.10), light movement (×1.11–1.25, uses ×1.20), frequent standing/
  walking (×1.26–1.40, uses ×1.35), physically active routine (×1.41–1.55,
  uses ×1.50), and very demanding physical work (×1.56–1.60, uses ×1.60).
  These categories are approximate illustrative **product presets**, not
  measured activity factors or validated activity standards. The selected
  exact multiplier is shown. No choice is preselected; older custom stored
  multipliers are retained until deliberately replaced.
- **Estimated non-workout background** = resting estimate ×
  **explicitly chosen 1.00–1.60 multiplier** in Settings.
  Its intent is non-exercise routine movement/thermic effects, not the
  conventional exercise-inclusive activity factor; `activityLevel`
  alone never selects it. Missing multiplier means unknown background.
- **Estimated additional workouts** = sum of manually designated
  **active/incremental** kcal or net MET kcal:
  `max(0, MET−1) × 3.5 × recordedKg / 200 × minutes`.
  Never infer MET from the activity name. For MET, use recorded
  weight on or before the workout day, explicitly identifying any
  carried-forward older weight. Future or duplicate legacy weights are rejected.
- **Estimated total daily expenditure** = background + additional workouts,
  only for a marked-complete day where every logged workout has known incremental
  energy. A marked-complete day with no workouts recorded contributes a
  zero *logged workout increment* for that day; this is not a claim about
  unrecorded spontaneous activity.
- **Estimated difference** = known complete logged calories consumed −
  total estimated expenditure. Partial calories, a water-only day, or
  incomplete total expenditure means unknown.

All values are estimates; body composition, conditions, medication, routine
movement and energy absorption can change real needs. No same-day predicted
weight change or compensatory-exercise instruction is provided. Users can
leave equation parameters or multiplier blank and continue logging normally.

## Historical and offline integrity

- Each entry keeps its selected **local** `YYYY-MM-DD`, independent from
  UTC audit timestamps. Today's relative dates use local JS date parts,
  not `toISOString().slice(0,10)`.
- Each day selects the latest applicable `goalPeriods.effectiveFrom`
  ≤ its own day. Score calculations use the *current rule-code version*;
  if the implementation changes scoring later, historical statuses may
  recalculate, but raw logs and past goal settings are preserved.
- Dexie v2 is unchanged in this phase: existing `dayReviews` is keyed by
  `dayKey`. Optional `note`/`updatedAt` and profile/goal rule fields
  are additive, no destructive migration or server calls.
- Tests cover incomplete days, missing nutrients, under-18 gating, statuses,
  historical goals and bands, meal edits, completion/reopening, local calendar,
  optional expenditure and no double-counting.

**Outstanding for v1:** real-mobile/offline install E2E verification, backup/
restore, and Phase 3 accessible trends. This implementation is not a clinical tool.
