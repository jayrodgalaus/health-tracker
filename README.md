# Health Tracker

A mobile-first, offline-first personal wellness PWA built with **React, TypeScript, Vite, Tailwind CSS and Dexie/IndexedDB**. All personal logs are saved only in the current browser's local IndexedDB; no account, backend, cloud sync, telemetry, AI or remote nutrition services.

## Development state

**Phase 0 foundation:** React + Vite shell, five accessible navigation tabs, PWA manifest/service worker/icons, typed models, Dexie schema and local-day helpers.

**Phase 1 in progress — first usable slice:** First-launch onboarding with date of birth **or** dated age, height, initial measured weight and a personal goal. Optional equation parameter and background activity setting are never inferred. Settings supports profile edits, kg/lb and cm/ft-in, ml/fl-oz preferences, user-selected targets, and effective-dated goal history. Log supports one primary weight per local date: create, edit, move to another vacant date, delete with confirmation and review chronological measurements. Today displays actual recent weight and does not invent calorie totals.

**Still planned in Phase 1:** Food/saved-label logging, water and drinks, exercise, and nutrient/fluid/activity aggregation. **Phase 2:** deterministic evaluation and calendar. **Phase 3:** trends and mandatory JSON backup/restore (before v1).

The source of truth is *Personal Health Tracker — Development Guide v1.0* (November 6, 2026), §§2–6, 9–11, 15.

## Development

Node.js 22 or a supported LTS and npm:

```sh
npm install
npm run dev
```

Checks:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

For an offline smoke test, load a production preview once while connected, switch the browser offline, reload and edit a measurement. Service workers are intentionally disabled in Vite dev mode. Check mobile PWA installation and service worker behavior on the target platform separately.

> This project does not yet have a committed package-lock.json. Generate and commit one from a verified npm installation before production releases. CI temporarily uses `npm install` instead of `npm ci`.

## Data integrity and privacy

- **Single persistent store:** Dexie/IndexedDB, in this browser and origin. No user health information belongs in this public repository.
- **Phase 0 compatibility:** Existing `profiles`, `goalPeriods` and `weightEntries` tables and their primary keys are preserved. The v1 schema remains unchanged because Phase 1 adds optional fields, not new indexes or stores. The weight repository enforces at most one entry per local day transactionally; if legacy duplicates are found it fails safely, without deleting them.
- **Unit handling:** All weights are stored in kg and heights in cm. User preference changes never rewrite those canonical quantities. Rounding is for display only.
- **Historical goals:** New target revisions take effect on a chosen current or future local day. Previous periods remain stored and can be retrieved per date.
- **Unknown is not zero:** No missing meals, nutrient labels, energy estimates, or weights are fabricated. Missing entries do not imply bad days.
- **Logged day boundaries:** `YYYY-MM-DD` is the explicitly selected local date; audit timestamps are independent UTC ISO values. Backdating does not relocate another day's record.
- **No destructive migrations:** Future Dexie schema upgrades must be versioned, tested against existing synthetic records, and preserve personal data.
- **Data loss warning:** Browser/device cleanup or eviction can erase IndexedDB. Export/import backup is mandatory before v1.
- **Wellness only:** This is not a clinical device or diagnosis tool. Evaluations may be inaccurate for people with pre-existing conditions or taking medicines affecting metabolism/fluid balance. No adult calorie-needs or weight-goal evaluation is provided to users under 18; only basic logging.

## Manual verification before merging

1. Fresh browser profile → onboarding → fill DOB (or age with as-of date), height, weight and goal → reopen the browser and confirm profile and first weight persist.
2. Settings → change units → check original kg/cm values remain identical in IndexedDB, not rounded.
3. Log → add historical weight → edit → move to empty date → reject occupied-date move → delete after confirmation.
4. Settings → revise manual energy target today → ensure prior historical goal remains unchanged.
5. Repeat offline after a successful initial production PWA load; check 320/360/390/430px and desktop widths.

No real health data or backup exports are stored in the repository.
