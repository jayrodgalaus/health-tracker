# Personal Health Tracker — local backup and restore

Scope: Phase 3, Development Guide v1.0 §5.5 and §§9.6, 13–14.

## Backup format

`formatVersion: 1` with a UTC `exportedAt` timestamp, application metadata
(name `health-tracker`, application version, Dexie schema version 2) and **all
eight user-owned tables**: `profiles`, `goalPeriods`, `savedFoods`,
`foodEntries`, `exerciseEntries`, `weightEntries`, `dayReviews`,
`appSettings`.

No credentials, tokens, background telemetry, or remote sync are involved.
Backups may contain sensitive personal nutrition, activity, weight and profile
information. They are **plain JSON, not encrypted**. Store exports safely and
avoid committing them to the public repository.

## Export (Settings → Data)

1. Open **Settings → Data**; the screen shows current per-table counts.
2. Choose **Prepare export preview**. The app reads one consistent
   IndexedDB snapshot, validates it, and shows the exact exported timestamp
   and counts for that snapshot *before* any download.
3. Choose **Download this validated JSON backup** and confirm the browser
   actually saved the file in a secure place. The previewed snapshot is
   fixed; refresh it if entries changed since preparation.

The format supports files up to **25 MiB**. If the snapshot exceeds this
bound, export fails visibly without modifying stored data; expanding format
limits must be reviewed alongside parser resource-safety constraints.

## Import (replace only)

1. **Export the current local dataset first.** Import is destructive replace,
   not merge, and there is no automatic undo.
2. Select a JSON file in **Settings → Data**. It is read locally. Format,
   application/schema version, table names, record shapes, allowed fields,
   numeric bounds, units, local dates, ISO timestamps, uniqueness and (for
   new-format food logs) saved label-to-consumed nutrient consistency are
   validated before any write.
3. Review the backup timestamp and counts. Type **REPLACE** to explicitly
   authorize replacement.
4. All eight stores are cleared and reinserted inside **one Dexie transaction**.
   If *any* insert fails, IndexedDB rolls back the replacement. The
   existing dataset stays unchanged after a failed import.

Future, unknown, malformed, over-limit and unsafe backup versions/records
are rejected. No schema overwrite, merge conflict resolution, automatic
data repair, nutrient interpolation, or cloud transfer occurs.

**Important:** A browser origin/profile has its own IndexedDB. Import on a
different origin/browser is a deliberate transfer. An earlier or newer code
version may not accept this backup format: always preserve the original file.

## Reset

The **Delete all local data** control is separated into a danger zone.
Open the explicit confirmation and type **DELETE**. A successful
transaction clears all eight stores and returns the user to onboarding.
A saved backup is the only recovery mechanism; resetting browser data
outside the app may bypass confirmation.

## Verification

- Fake-IndexedDB integration tests: export/JSON serialization/complete
  restore after clearing and reopening, record/snapshot equality, malformed
  file rejection with unchanged records, a forced write failure after
  clearing with full transaction rollback, and full reset.
- Playwright Chromium browser workflows: mobile logging/persistence/offline
  reload, download → delete → upload → replace, malformed upload and
  phone-sized viewport checks (see `tests/e2e`).
- Manual checks still required: iOS Safari and Android Chromium,
  installed home-screen operation, file handling and storage-persistence
  behavior under device pressure. Passing simulated Chromium tests
  alone is not proof of real-device compatibility.
