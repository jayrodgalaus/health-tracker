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
- **Plain water is hydration-only for every nutrient**, including calories.
  Entries explicitly tagged `beverageType: 'water'` are excluded from every
  nutritional aggregate and its coverage denominator, but their measured
  `fluidMl` remains included once in logged fluids. For example, 13
  sodium-known food/other-drink entries plus 3 plain-water logs yield
  **13/13** sodium coverage, not 13/16. This applies to existing saved days
  on recalculation without rewriting historical nutrient snapshots.
  Other beverages with unknown nutrient values remain unknown and do
  reduce that nutrient's coverage. Water-only logs are not evidence of
  complete nutritional intake; fluid goal coverage remains independent.
5. All mandatory values are finite and valid.

Otherwise status is **incomplete**. An unmarked day can show provisional rules
for an adult, but is never assigned a positive or negative overall result. For
minors or unknown adult age, even provisional adult goal judgments are withheld.

Supported **daily rule targets** are user-entered calories, protein, fiber,
fluid and an optional *upper tracking* sodium amount; unspecified targets are
not evaluated. Exercise is summarized on a Monday–Sunday weekly basis and
does not make a rest day fail; weight trends do not score daily health.

## Historical goal alignment and completed-day locks

Completion is now an explicit **archive action**. Both Log and Daily goal
alignment require a confirmation before completing a date. The completion
transaction saves a versioned immutable `DayReview.frozen` snapshot of the
daily summary, status, every rule's target and explanation, scoring-rule
version/configuration, nutrient-reference profile, optional nutrient
comparison limits and the week's activity summary as displayed then.
Today, Calendar and Trends use archived summaries for completed dates;
later goal, profile, target, rule, or reference changes do **not** silently
rescore them. Food/drink/water, workout and weight writes for a locked
date (including attempts to move a record into or out of that date) are
rejected atomically by the repositories. Entry views are read-only.

**Reopen day** deliberately discards that snapshot, permits corrections
and resumes live calculations. The next completion archives a new state
using goals effective at that time. An incomplete/unassessable day can
still be completed and locked, preserving its neutral status: completion
alone never invents unknown nutritional amounts.

The Dexie v2→v3 migration keeps every record, and freezes legacy completed
dates once using their *currently available* records, profile and
historically effective goal settings. It cannot reconstruct values that
were already overwritten before the migration; no original-history claims
are made. Old v2 JSON backups are supported and normalized similarly on
import. Exported v3 JSON includes versioned archived snapshots, and
invalid snapshots are rejected prior to the replace transaction. None of
this adds remote storage or background synchronization.

## Calendar nutrient reference percentages

The Calendar Day Detail nutrient card separately compares available recorded
nutrients with applicable adult FNRI PDRI daily RNI/AI references. These
informational percentages are **not goal scores** and do not depend on
whether the day is marked complete.

When at least one entry supplies a nutrient, display its known recorded amount
divided by the applicable reference even if other entries lack that nutrient.
Incomplete coverage is explicitly labeled **“At least”** for amounts and
**“≥X%”** for percentages: the actual day total could be higher. Preserve
the per-nutrient coverage count. If nothing is known, display “unknown %”,
not 0%; without an applicable single-value reference, display “no reference %”
instead of inventing one. Currently defined adult comparisons are protein
(where a sex-based reference is supplied), fiber and potassium; they follow
age on the selected historical date. No daily gram-based percentage is
inferred for carbs, fat, sugars or unsupported sodium comparisons.

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

### Optional carbohydrates, sugar and sodium upper comparisons

Settings → Preferences provides optional daily upper comparison limits for
**carbohydrates (g/day)**, **total sugars (g/day)** and **sodium (mg/day)**. They are stored alongside
water quick-add preferences in local IndexedDB. No limits are preselected.
When configured, Calendar day details compare the known recorded amount
with each user-defined limit. Over 100% means more than that upper limit is
recorded, not that excess is desirable. Partial nutrient coverage retains
the “At least” and “≥X%” disclosures. Unknown is not treated as zero.

These are global display preferences, so changing them changes comparisons
shown for any viewed historical date without rewriting log snapshots. They
do **not** affect the effective-dated Goals, the sodium goal scoring rule,
or daily evaluation statuses. Total sugars do not imply added sugars;
no official RENI upper limit is inferred for any of these nutrients. Existing Dexie v2 settings and
backup files without these optional fields remain compatible.

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
- **Estimated additional workouts** = sum of exactly one method per entry:
  manually designated **active/incremental** kcal, user-provided net MET kcal
  (`max(0, MET−1) × 3.5 × recordedKg / 200 × minutes`), or for specifically
  selected walking/running the new approximate **automatic** estimate.
  New `paceGradeNet` estimates interpolate level-ground METs between
  selected 2024 Adult Compendium speed categories (walking 2–8 km/h and
  running 6–25 km/h), rather than use a coarse intensity label:
  https://pacompendium.com/walking/ and https://pacompendium.com/running/.
  Speed comes from explicitly entered km/h first; otherwise from
  `distanceKm / durationMinutes × 60`, or from a disclosed 5 km/h walking
  or 10 km/h running assumption when pace is unavailable.
  The base net kcal is `(paceMET − 1) × 3.5 × recordedKg / 200 × calculationMinutes`.
  An optional 0–15% uphill grade adds ACSM's vertical VO₂ component,
  `1.8 × speed(m/min) × gradeFraction` for walking and
  `0.9 × speed(m/min) × gradeFraction` for running, converted to net kcal
  with weight and calculationMinutes
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC12419060/).
  Blank grade is **assumed level ground for this estimate**, not a measured
  grade of zero. Downhill grade, variable terrain, and wind are not modeled.
  When distance is known, calculationMinutes is derived from distance/speed
  (entered speed takes precedence); any separately logged duration is not
  rewritten or added to energy. Speed and incline must be valid or the
  estimate remains unknown. Only one calorie method is counted.
  Preexisting `distanceNet` and `activityTimeNet` records continue
  using their original coefficients for historical continuity.
  For all calculated methods, use recorded
  weight on or before the workout day, explicitly identifying any
  carried-forward older weight. Future or duplicate legacy weights are rejected.
- **Distance-only sessions** retain `durationMinutes: null`; the user has
  recorded distance, not time. Daily/weekly minute summaries show known
  minutes as partial when such a session exists. No guessed minutes or
  synthetic energy measurements are stored. The exercise preview calls the
  same pure calculation as the saved day and charts, updating immediately
  as inputs change. The new optional `speedKmh` and `inclinePercent` fields
  and `paceGradeNet` method are backward compatible with Dexie v2 and
  historical JSON backups; recorded legacy intensity values are preserved
  even though the selector and intensity chart are no longer shown.
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
