# Health Tracker

A personal, mobile-first, offline-capable nutrition and activity tracker built with **React + TypeScript + Vite, Tailwind CSS and Dexie/IndexedDB**. No cloud account, server, remote personal-data storage, AI, analytics, or health integrations.

## Phase 3: local trends and JSON portability (in review)

- **Phase 0:** Five-tab mobile navigation, installable PWA shell and service worker, typed models and local IndexedDB.
- **Phase 1 profile/weight:** First-launch local profile, age/DOB, height, initial weight, editable unit preferences, user-selected targets with effective-date history, per-day weight add/edit/move/delete.
- **Phase 1 food/fluids:** Food and beverage logging with named amounts, optional meal category, nutrition fields, per-serving / per-piece / per-100-g / per-100-ml / custom label basis, saved reusable labels with favorites, recent entries, water presets and custom water volume, and edit/delete. Settings allows four local water-preset amounts.
- **Phase 1 exercise:** Dated workout log with activity type, duration, optional intensity, strength-training flag, time and notes, plus edit/delete. Exercise energy is either deliberately unknown, user-entered *active/incremental* kcal, or a net estimate based on a manually supplied MET and the most recent weight measured on or before that day. All energy figures are explainable estimates, not measurements; missing prerequisites remain unknown.
- **Live activity summaries:** Today and Log share pure `calculateActivityDay()` and `calculateActivityWeek()`; logged minutes, weekly moderate/vigorous/light minutes, and distinct logged strength days are visible, without scoring rest days. Historical weight corrections dynamically update MET estimates.
- **Live Today + Log summaries:** One shared pure `aggregateIntake()` implementation for calories, protein, carbs, fat, fiber, sugars, sodium, potassium and fluids, with explicit known/unknown coverage and “at least” partial totals.

**Phase 3 implemented (pending real-device QA):**
- **Trends** with 7/30/90-day and custom up-to-366-day windows: calorie intake, estimated expenditure/difference, measured weight (actual dates only), selectable nutrients, fluids, full-week activity/intensity/strength days and adherence percentages counting **only assessable completed days**. Charts scroll horizontally, have readable native value tooltips, textual coverage summaries and dated links. Data is calculated with the same `calculateDay()` logic as Today and Calendar.
- **Settings → Data**: self-contained versioned JSON export across all eight Dexie stores, timestamp and record counts, local file import with strict schema/version/value/duplicate-date/timestamp validation, preview and explicit **REPLACE** confirmation (no unsafe merge). Transactional restore rolls back if a store write fails. Separate destructive **DELETE** confirmation clears all local records; backup-first warning and privacy disclosure are persistent.
- **Remaining for v1:** real-device installation/offline-restart/mobile viewport/accessibility end-to-end checks and a reproducible npm lockfile. This is still an unmerged feature branch, not a validated production release.

**Phase 2 implemented:** Local Monday-first monthly calendar with explicit on-target/mixed/off-target/incomplete symbols and accessible legend; tap any date for its full recorded entries, explanation of every rule, edit/delete links back to its selected Log day, and complete/reopen controls. Today also supports historical date switching and shares the exact same pure `calculateDay()` evaluation engine with the calendar.
- Day evaluations use *only* targets in the effective-dated goal period. User-adjustable energy, minimum-nutrient/fluid and sodium alignment bands are stored with the goal period. Completing an empty or partially known day cannot make it red or green, and unknown calorie labels remain unknown.
- Optional adult RMR estimation uses Mifflin–St Jeor when measured/current or historical weight, age, height and explicit equation constant are present. **Estimated total daily expenditure** is shown only with an explicitly selected 1.00–1.60 **non-workout** background multiplier and a marked-complete day with complete workout incremental-energy data. Consumed−expended difference requires complete recorded intake; no deficit or weight change is prescribed.
- **Phase 3 remains:** 7/30/90-day charts, historical trend views, mandatory JSON export/validated import, local reset, further mobile/offline QA and a reproducible npm lockfile. No production deployment or phone-browser E2E test is claimed.

Source of truth: *Personal Health Tracker — Development Guide v1.0* (November 6, 2026), especially §§4.4–4.7, 5, 6.2–6.3, 9.2, 10, 11.

## Run and verify

Requires Node.js 22 (or supported LTS) and npm.

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

The production PWA works offline after a successful initial load where supported. Dev mode does not register the service worker. To test, build/preview, open online once, then simulate offline and reload. Actual iOS/Android home-screen and browser-storage behavior still needs manual validation.

> A committed `package-lock.json` is outstanding. CI installs packages using `npm install`; switch to `npm ci` once the lockfile is generated and verified.

## Data integrity guarantees

- **Only IndexedDB persists data.** No user wellness records, backups, or credentials may be committed to the public repository.
- **Compatibility and upgrades:** Dexie v1 tables, keys and data are retained. Dexie v2 adds only the `appSettings` table for water preferences; migrations are tested with a synthetic v1 database containing dated food and weight records.
- **Historical nutrition:** Every intake entry preserves both the consumed nutrient snapshot and the original label reference values, basis, quantity and unit. Editing/deleting a saved product does **not** change previous log entries. Legacy entries lacking a label-reference snapshot reconstruct it from their consumed snapshot when edited.
- **Quantities:** gram↔ounce and ml↔US fluid ounce conversions are supported; no ml↔g or piece↔gram conversions without a supplied equivalence. Unknown label values are `null`, not 0. Nutrient calculations retain precision until display. Incorrect, nonfinite, negative or out-of-range inputs are rejected before persistence.
- **Drinks:** Every drink has one nutrient record and optional known fluid volume. Plain water has known 0 kcal; other beverages with unknown kcal contribute volume but not fictitious zero calories. Fluid tracking is not a medical hydration assessment.
- **Days and goals:** Local calendar day keys are independent from UTC audit timestamps. Historical weights and targets remain dated; unlogged days have no assumed values or scores.
- **Workout energy:** An optional manually selected MET gives *net above-rest* kcal `max(0, MET − 1) × 3.5 × recorded weightKg / 200 × minutes`, never gross kcal. The latest recorded weight on or before the workout date may be carried forward with disclosure; future weights are never used. Ambiguous legacy duplicate weight days prevent estimation. Manual values must explicitly be *active/incremental*, so gross device totals are not silently counted twice.
- **Backups:** v1 backup format includes every user-owned IndexedDB store (profile, dated goals, saved labels, food and drink entries, exercise, weight, day reviews, app preferences). The import validator checks each record, rejects corrupt/malformed, unexpected fields or incompatible future versions, and requires an atomic replacement; it never silently truncates or converts unknown nutrients to zero. The file is **not encrypted** by Health Tracker and must be stored securely.
- **Goal evaluations:** Only a completed, confirmed adult day with at least one configured daily target and complete evidence for **all configured evaluated targets** receives an on/mixed/off status. Unmarked, unlogged, missing-field and under-18 days remain gray. Daily rules cover selected energy, protein, fiber, fluid and sodium tracking targets. Activity is reviewed weekly and weight is not used as a daily score. Bands are user-adjustable with future-effective goals and rule version 1.0.0. See `docs/evaluation-rules.md`.
- **Weekly activity:** Monday–Sunday local weeks, unclassified exercise remains visible, strength days count distinct dates. Unlogged rest days are neutral.
- **Privacy/safety:** Adult-oriented needs and weight-goal evaluation are not used for people under 18. The app is a personal wellness tracker, not a medical device; estimates may be inappropriate for people with medical conditions or medications affecting metabolism/fluid balance. No clinical history is collected.

## Manual checks still required

1. Fresh onboarding → save profile and initial weight → close/reopen browser.
2. Log 1.5 servings of a 230 kcal/serving saved food → expect 345 kcal. Log 75 g of a 100 g label → expect correctly scaled values. Invalid mass/volume conversions must display an error.
3. Log a 300 ml drink with 120 kcal and 250 ml plain water → expect 120 kcal, 550 ml. Add an unknown-calorie drink → calories become partially known (“At least…”), fluids remain fully logged.
4. Change a saved product's label, then inspect an earlier recorded meal: label snapshot and calories must stay unchanged. Edit or delete the meal and inspect instant updates on Today and Log.
5. Set four new water quick-add amounts in Settings, close/reopen and use them offline. Check a legacy v1 database upgrades to v2 without losing logs.
6. Log exercise on a prior day with a known manual ACTIVE calorie amount; verify kcal appears once in the separate workout-increment summary, not as total daily expenditure. Edit, move, delete and restart.
7. Enter a manually sourced MET with a dated prior weight; verify the net increment and source-day explanation. Correct the prior weight, verify recomputation; no future weight can fill a historical gap. Add an unestimated session and check partial coverage.
8. Check Monday–Sunday intensity minutes and distinct strength-training days, including a week spanning a month boundary. Under-18 dates permit simple logging without adult workout-energy estimates.
9. Calendar: navigate across leap dates and year boundaries; inspect an unmarked day, a completed unassessable day, an assessable aligned/mixed/off-target day; verify the legend and date detail explanations. Edit a saved meal from Log, then confirm Today and Calendar status recompute with identical raw totals. Reopen a day and confirm neutral status. Verify historic rule thresholds and targets remain stable after Settings revisions.
10. Configure a non-workout multiplier, equation constant and dated weight; check RMR, background, incremental workout and total separately. Missing calorie coverage, an unknown workout, unconfirmed adult age or unmarked day must withhold total/difference. Test historical weight edits never use future values.
11. Trends: compare any selected date with Today and Calendar Detail; verify unknown and partial nutrition, missing weight, estimated expenditure and difference are not zeroed. Navigate 7/30/90/custom, dates spanning February leap day and full Monday–Sunday weeks, and verify the on-target denominator excludes incomplete days.
12. Settings → Data: export JSON and confirm every store and count. Clear all data with DELETE, restore with REPLACE, reload and verify profile, goals, logs, saved-food snapshots, day reviews, preferences and calculations all match. Try malformed JSON, negative weights, invalid timestamps, duplicate dated records, injected properties and unsupported version—verify existing data is unchanged.
13. Check touch targets, screen readers and viewport widths of 320, 360, 390 and 430px, plus desktop.

No real personal records or backup exports are included.
