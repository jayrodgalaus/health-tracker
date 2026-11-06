# Health Tracker

A personal, mobile-first, offline-capable nutrition and activity tracker built with **React + TypeScript + Vite, Tailwind CSS and Dexie/IndexedDB**. No cloud account, server, remote personal-data storage, AI, analytics, or health integrations.

## Implemented through Phase 1 (nutrition slice)

- **Phase 0:** Five-tab mobile navigation, installable PWA shell and service worker, typed models and local IndexedDB.
- **Phase 1 profile/weight:** First-launch local profile, age/DOB, height, initial weight, editable unit preferences, user-selected targets with effective-date history, per-day weight add/edit/move/delete.
- **Phase 1 food/fluids:** Food and beverage logging with named amounts, optional meal category, nutrition fields, per-serving / per-piece / per-100-g / per-100-ml / custom label basis, saved reusable labels with favorites, recent entries, water presets and custom water volume, and edit/delete. Settings allows four local water-preset amounts.
- **Live Today + Log summaries:** One shared pure `aggregateIntake()` implementation for calories, protein, carbs, fat, fiber, sugars, sodium, potassium and fluids, with explicit known/unknown coverage and “at least” partial totals.

**Remaining Phase 1:** Exercise type/intensity/duration, optional transparent energy estimates, and activity aggregation. **Phase 2:** Mark-day-complete, deterministic evaluation and monthly calendar. **Phase 3:** Trends, mandatory validated JSON backup/restore, and phone/offline QA.

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
- **Privacy/safety:** Adult-oriented needs and weight-goal evaluation are not used for people under 18. The app is a personal wellness tracker, not a medical device; estimates may be inappropriate for people with medical conditions or medications affecting metabolism/fluid balance. No clinical history is collected.

## Manual checks still required

1. Fresh onboarding → save profile and initial weight → close/reopen browser.
2. Log 1.5 servings of a 230 kcal/serving saved food → expect 345 kcal. Log 75 g of a 100 g label → expect correctly scaled values. Invalid mass/volume conversions must display an error.
3. Log a 300 ml drink with 120 kcal and 250 ml plain water → expect 120 kcal, 550 ml. Add an unknown-calorie drink → calories become partially known (“At least…”), fluids remain fully logged.
4. Change a saved product's label, then inspect an earlier recorded meal: label snapshot and calories must stay unchanged. Edit or delete the meal and inspect instant updates on Today and Log.
5. Set four new water quick-add amounts in Settings, close/reopen and use them offline. Check a legacy v1 database upgrades to v2 without losing logs.
6. Check touch targets, screen readers and viewport widths of 320, 360, 390 and 430px, plus desktop.

No real personal records or backup exports are included.
