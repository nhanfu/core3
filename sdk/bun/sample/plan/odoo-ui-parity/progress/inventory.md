# Inventory progress

Status: in-progress
Owner: inventory module owner
QA slot: dispatchable inventory QA
Trigger: feature-complete
Candidate commit: `3aec95dc` (`feat(inventory): add settings parity slice`)

## Completed in this worktree

- Added manager-only Inventory > Configuration > Settings menu at
  `/inventory/settings`.
- Added declarative `SettingsView` page and matching service-owned API fragment
  joined by `page.id: inventory-settings`.
- Added deterministic settings schema/data migration `0.0.17` with fixed
  `2026-01-15` timestamps and rerunnable inserts.
- Added persisted settings update contract with required row-version and
  missing-record guards.
- Added focused integration coverage for menu/page/API ownership, defaults,
  idempotent migrations, save mutation, stale writes, and missing records.

## Evidence

- Focused Inventory suite: `bun test ./test/inventory*.integration.test.ts --timeout 20000` — 39 tests, 437 assertions passed across 13 files.
- Baseline inventory suites: 31 passed and 5 concurrent-glob timeouts; all 5
  timeout suites pass individually, confirming resource contention.
- UI audit: `bun run audit` — 648 pages, 663 routes, 1113 datasources passed.
- CSS: `bun run css:build:inventory` passed.
- Formatting: `git diff --check` passed.
- Authenticated Core3 browser: isolated runtime `3316`, admin user,
  `/inventory/settings`, desktop 1440x900 and mobile 390x844 rendered with no
  failed requests/page errors and no horizontal overflow. Captures:
  `/tmp/core3-inventory-settings-desktop.png`,
  `/tmp/core3-inventory-settings-mobile.png`.
- Direct authenticated mutation: `/api/mutate` with
  `inventory.settings.update`, `values`, and `expected_row_version` returned
  the updated row with incremented `row_version`.
- Fresh authenticated module-scoped route matrix on port 4026: 24 routes ×
  desktop/mobile = 48/48 passed with valid seeded detail IDs, no page/request
  errors, HTTP failures, or horizontal overflow; raw result:
  `/tmp/inventory-matrix-isolated.json`.
- Current Odoo reference `core3_reference` paired Packages at desktop/mobile;
  Core3 had no failures, while Odoo mobile recorded three navigation-aborted
  avatar/action requests and no page errors. Captures are under
  `/tmp/core3-odoo-parity/paired-inventory-20260912/`.

## Remaining blockers

- Browser Save now passes through the shared mutation transport: the generic
  server action includes the SettingsView draft as `values`, and an
  authenticated Save followed by reload preserved the changed checkbox.
- Odoo paired Settings screenshots remain open; the current reference session
  is available and Packages has now been paired.
- Literal `schema.yaml` / `demo.yaml` migration consolidation is blocked by
  the current timestamp-only migration discovery contract; do not rewrite
  existing migration history from this isolated module worktree.
