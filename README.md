# Health Tracker

A **mobile-first, offline-capable personal wellness PWA** built with React, TypeScript, Vite, Tailwind CSS, and Dexie/IndexedDB. All personal records stay in the user's browser. No accounts, server, cloud sync, AI, telemetry, or remote nutritional lookups are included.

## Phase 0 — foundation

- Five-tab responsive shell: **Today, Log, Calendar, Trends, Settings**.
- Installable PWA manifest with 192px and 512px icons and precached app shell for offline revisits (after the initial online load).
- Versioned Dexie IndexedDB database for profile, targets by effective date, saved foods, food/beverage logs, exercises, weight entries, and day completion marks.
- Strong TypeScript domain models. Unknown nutrition values are `null`, never silently zero. Logged food snapshots preserve original label basis and quantity; beverages use a single food entry to prevent double-counting.
- Strict local calendar-day utilities and automated tests for dates and IndexedDB persistence.
- Explicit placeholders for later phases: there are **no working logging, evaluation, charts, or backup screens yet**.

### Development

Requires Node.js 22 or a supported LTS and npm.

```sh
npm install
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

For offline testing, build and preview over localhost, load once while online, then use your browser's offline network mode and reload. PWA service workers are disabled in Vite's development mode. Installability and cache behavior should be checked on the target browsers; browser support and storage policies vary.

> This starter does not yet ship a lockfile. Generate and commit `package-lock.json` from a verified npm installation before relying on reproducible production builds; the temporary CI job uses `npm install`.

### Data and safety

- **Persistent storage:** IndexedDB only. Never commit personal data or local backup files to this public repository.
- **No sample entries:** missing/unlogged is never converted to zero. A completed day and enough assessable measurements will be prerequisites for future evaluation.
- **Date handling:** `LocalDay` stores the calendar day in the user's local timezone. Timestamps include offsets when sourced from inputs. Target changes are modeled as effective-date periods.
- **Migrations:** schema starts at Dexie `version(1)`; future releases must add forward-only, tested upgrades without deleting user data.
- **Adults only (18+):** this is not a clinical tool. Calorie/activity estimates may be inaccurate, including for users with pre-existing medical conditions. It offers no diagnosis or treatment.

### Planned phases

1. **Daily logging:** user-entered profile, goals, foods, water, exercise, and weight; edit/delete and saved foods.
2. **Evaluation + calendar:** deterministic rules, explainable status, day completion, local-day details.
3. **Trends + backups + polish:** accessible charts, date filters, **mandatory JSON export and import/restore** before v1.

The source of truth for feature acceptance is the Personal Health Tracker Development Guide v1.0; this repository foundation implements only Phase 0.
