# Health Tracker v1 release verification checklist

Follow Development Guide v1.0 §§9–10 and §14; do not mark v1 done until
these checks pass on real devices, not only GitHub Actions.

## Automated coverage

Run `npm run typecheck`, `npm test`, `npm run build` and
`npm run test:e2e` (Playwright Chromium installed). The CI workflows
build production assets and test at 320/390/430 px, including a
service-worker offline restart and JSON backup/reset/restore workflow.

## Phone and offline (manual, not claimed as complete)

- Android Chrome: first load over HTTPS, confirm install prompt where
  supported, add to home screen, launch standalone and log a real test day.
- iOS Safari: use Share → Add to Home Screen, launch, save entries,
  fully close/reopen and verify IndexedDB on the same origin.
- After the first successful cached load, turn on Airplane Mode:
  confirm Today, Log, Calendar, Trends and Settings work, and new
  entries remain locally persisted after restart.
- Check warning and error states when IndexedDB is denied, disk is
  full, file access fails or browser storage is cleared.
- Test back/forward, deep links and browser refresh while offline,
  keyboard focus order, VoiceOver/TalkBack labels and reduced motion.
- View at 320, 360, 390 and 430 CSS px; verify native date controls,
  chart scroll, text contrast, tap targets and bottom navigation.
- After changing app/service-worker version, ensure the old data is
  available following the Dexie v1→v2 migration and stale-cache update.

## Cross-screen data integrity

- Log food with 230 kcal per serving × 1.5 servings = 345 kcal,
  and 75 g per 100 g nutrition. Unknown nutrients remain null.
- Drinks with calories contribute exactly once to calories and
  exactly once to fluid; plain water is a known zero kcal.
- Edit historical food, water, exercise and weight; Today, Day Detail,
  Calendar and Trends must update consistently.
- Unmarked days, incomplete nutrient coverage and rest days are
  never assigned an off-target status.
- Weight graph uses only actual measurements; exercise METs never
  use weights recorded after the workout date.
- 7/30/90/custom trends: inspect missing days, partial values,
  weekly boundaries, strength days and adherence denominators.

## Backup and safety

- Prepare preview and review counts, export secure JSON, reset
  with DELETE, import with REPLACE, and compare values of all tables.
- Verify malformed, corrupt, version-incompatible or injected JSON
  cannot overwrite the existing dataset.
- Keep personal backups outside the public repo; test with
  synthetic fixtures only.
- Confirm no account, remote database, telemetry, AI or
  background data upload was introduced.

**Release blocker:** A committed npm lockfile and real iOS/Android
installed/offline manual checks are still outstanding.
