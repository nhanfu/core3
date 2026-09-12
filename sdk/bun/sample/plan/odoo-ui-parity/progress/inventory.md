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
- Fresh authenticated transfer workflow on port 4026 passed for
  `receipt-00003`: Admin moved `Draft` → `Waiting` → `Ready` → `Done`, with
  row versions 1 → 4, move completion persistence, and a timeline message;
  a stale cancel returned 409 and `fleet@tms.local` received 403 for
  `inventory.write`.
- Repaired transfer edit wiring by exposing `Edit details` in the form
  header and converting the edit contract to a YAML `server_form`; authenticated
  Save posted `inventory.pickings.update` and reload preserved the changed
  contact. Focused suite remained green at 39 tests / 439 assertions.

## Remaining blockers

- Browser Save now passes through the shared mutation transport: the generic
  server action includes the SettingsView draft as `values`, and an
  authenticated Save followed by reload preserved the changed checkbox.
- Odoo paired Settings screenshots remain open; the current reference session
  is available and Packages has now been paired.
- Literal `schema.yaml` / `demo.yaml` migration consolidation is blocked by
  the current timestamp-only migration discovery contract; do not rewrite
  existing migration history from this isolated module worktree.
- Remaining transfer CRUD browser interaction, remaining transfer operation kinds,
  and full Odoo workflow parity still require QA coverage; the single passing
  receipt workflow is not module completion.

## QA review record — candidate `84dd0f48` (2026-09-13)

- QA ledger `85fa66c1` confirmed the isolated transfer CRUD checks, workflow
  regression, audit (648/663/1113), and diff hygiene.
- Authenticated New/Delete and paired Odoo evidence were blocked; no module
  sign-off was granted.
- The product candidate was rejected by the merge agent because its page/test
  changes conflict with the active transfer edit implementation. Rebase the
  product candidate before another integration attempt.

## Rebased candidate review

- Rebased onto active checkout `a7088525`; retained the active `Edit details`
  form contract and test ordering, then added Draft-delete beside it.
- Receipt-create/Draft-delete focused tests and all requested checks are being
  rerun for the rebased candidate.

## Rebased candidate evidence

- Final candidate commit: `HEAD` (rebased onto active `a7088525`).
- Active transfer edit ordering is preserved: `Edit details` remains first;
  Draft Delete is the following action and the regression test matches it.
- CRUD suite: 3 tests / 13 assertions passed. Transfer workflow suite: 3
  tests / 43 assertions passed.
- UI audit passed: 659 pages, 668 routes, 1136 datasources. Inventory CSS
  build, scoped ESLint, and `git diff --check` passed.
