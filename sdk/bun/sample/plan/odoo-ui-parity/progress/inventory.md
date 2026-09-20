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

## `INV-SETTINGS-001` — Annual Inventory Day and Month (2026-09-20)

- Compared the Odoo `stock.action_stock_config_settings` / `menu_stock_general_settings`
  source and `res.company` defaults: day 31 and month December (`'12'`).
- Added durable annual day/month columns and deterministic backfill migration
  `20260920180000-022-inventory-annual-inventory-settings.yaml`.
- Extended the separate Settings API and `SettingsView` YAML contracts with the
  number/select controls and Save parameters, joined by `page.id`.
- Focused lifecycle coverage is 4 tests and 21 assertions: defaults and
  idempotence, save/row-version/stale/missing guards, read-only 403 page/API
  boundaries, and file-backed restart persistence.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-20/INV-SETTINGS-001/`; Save/reload preserved the
  values with no failed requests or horizontal overflow.
- The paired authenticated Odoo action was captured at both viewports but is
  blocked before form render by the exact `ir.actions.server(445)` RPC traceback
  recorded in the evidence folder.
- Status: bounded settings slice complete for review; full Inventory sign-off
  remains open for broader reports, operations, actors, and Odoo workflows.

## Transfer operation slice — Unreserve (2026-09-13)

- Added the Odoo form-bound `Unreserve` action to transfer detail for current
  Ready transfers, with `inventory.write` permission and row-version guard.
- The mutation transitions Ready → Waiting, increments the row version, and
  records `inventory.transfer.unreserved` in transfer history.
- Focused workflow coverage passes the action contract, success persistence,
  timeline event, stale-row, and non-Ready guards. Browser action capture is
  still a QA follow-up; this does not sign off Inventory.

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

## QA execution — candidate `a238bd3d` (2026-09-13)

- CRUD regression passed: 3 tests / 13 assertions. Workflow regression passed:
  3 tests / 43 assertions. Required/duplicate/stale/non-Draft guards,
  Draft-delete move cleanup, and repository persistence are covered by the
  focused tests; `Edit details` remains the first detail action.
- Audit passed at 659 pages / 668 routes / 1136 datasources. Inventory CSS,
  full frontend build, lint of the changed TypeScript tests, and `git diff
  --check` all passed.
- Authenticated Core3 desktop proved the 6-row receipts list, required-field
  feedback, valid Draft receipt creation (`WH/IN/QA-A238-2`, HTTP 200,
  row_version 1), and duplicate-reference HTTP 409. Mobile rendered the
  route with New available and no horizontal overflow. Fleet authenticated
  without the New write control.
- Authenticated Draft detail rendered `Edit details` then `Delete`, while a
  non-Draft detail hid Delete. Browser Delete did not pass: the shared action
  submitted an empty `expected_row_version`, causing DuckDB INT64 conversion
  failure, backend exit, and frontend HTTP 502. No browser deletion success
  is claimed.
- Paired authenticated Odoo receipts rendered at desktop and mobile with no
  horizontal overflow. Core3/Odoo captures are under
  `/tmp/core3-odoo-parity/` with the `inventory-a238bd3d-` prefix.

QA disposition: conditional; browser Draft Delete remains blocked. No module
sign-off.

## Repair evidence — Draft Delete row version

- Repaired the browser action params to resolve `{row.id}` and
  `{row.row_version}` from the loaded transfer record. This preserves the
  active `Edit details` action and all Draft/state/concurrency guards.
- Added a browser-shaped interpolation regression proving
  `receipt-00003` resolves with `expected_row_version: "1"`; the prior empty
  value and DuckDB INT64 conversion failure are covered by the defect context.
- Full Inventory suite: 42 tests / 454 assertions passed across 14 files.
- Audit passed: 659 pages, 668 routes, 1136 datasources. Inventory CSS build,
  scoped ESLint, and `git diff --check` passed.

## QA retest ledger — repair commit `9c73da7f` (2026-09-13)

- Exact target verified: `9c73da7feac10c5f40c849bffb1430e386b43dab`.
- Browser-shaped interpolation PASS: `receipt-00003` resolves with
  `expected_row_version: "1"`.
- Full Inventory regression PASS: 42 tests / 454 assertions across 14 files;
  audit 659/668/1136, Inventory CSS, frontend build, scoped ESLint, and diff
  check all passed.
- Authenticated Admin list smoke PASS at desktop 1440x900 and mobile 390x844:
  6 seeded receipts, no page errors, no horizontal overflow. Captures are at
  `/tmp/core3-odoo-parity/inventory-retest-9c73da7f/` outside Git.
- Draft Delete browser flow remains unverified: the initial wrong detail URL
  was corrected to `/inventory/transfer/detail`, but the bounded rerun got
  HTTP 503 `Service host unavailable` after service-host exit and emitted no
  mutation request. No live delete/persistence claim is made.
- Existing paired Odoo captures are retained as historical reference only; no
  fresh exact-commit pair was possible after the runtime failure.

QA disposition: retest incomplete / blocked on authenticated Draft Delete; no
Inventory sign-off or aggregate progress claim.

## 503 root-cause investigation

- The integrated route is `GET /inventory/transfer/detail?id=receipt-00003`
  through the frontend/API base; mutations use `POST /api/mutate` with
  `mutation: inventory.pickings.delete`.
- Clean single-module Inventory runner evidence: agent PID `3519103`, server
  PID `3519107`, listener `*:4143`; `/api/modules`, the exact detail route,
  login, and authenticated Draft Delete all returned HTTP 200. The delete
  response was reached with `expected_row_version: 1`.
- Gateway reproduction: PID `3524523` listened on `*:4144` with target
  `127.0.0.1:4199`; no `4199` listener existed. The exact detail request
  returned HTTP 503 `{error: Service host unavailable, code: TARGET_UNAVAILABLE}`.
  Therefore the QA 503 is runner/service-host infrastructure, before Inventory
  action dispatch; no Inventory product/runtime repair is indicated.
- Added client transport regression for the browser-shaped Delete payload.
  Full Inventory suite passes 43 tests / 455 assertions; audit 659/668/1136,
  Inventory CSS, scoped ESLint, and diff-check pass.

## QA retest ledger — exact candidate `31441d3f` (2026-09-13)

- Requested worktree path was absent; exact commit `31441d3f1a916a7aa5c0601dd2fe2473f34208fc` was retested at `/home/nhanjs/projects/core3-worktrees/inventory-dev4-20260913`.
- Full Inventory suite passed 43/43 tests and 455 assertions across 14 files; audit passed 659 pages / 668 routes / 1136 datasources; Inventory CSS, scoped ESLint, and `git diff --check` passed.
- Healthy module runner: agent PID `3578442`, server PID `3578446`, `*:4314`, `/api/modules` HTTP 200. Authenticated Admin Playwright desktop proved Draft `WH/IN/00003` Delete posted `expected_row_version="1"` and reload persisted deletion (`1-5 / 5`, reference absent). Artifacts remain outside Git at `/tmp/inventory-31441-{draft-before-delete,after-delete}.png`.
- Live stale and non-Draft deletes returned declared 409 guards; Fleet delete returned 403 `inventory.write` and the write action was hidden. Odoo login endpoint returned HTTP 200; historical authenticated paired receipts captures remain the available reference, with no fresh exact-commit Odoo pair claimed.

QA disposition: evidence complete for this retest; no Inventory sign-off or aggregate progress claim.

## QA disposition `f666cec5` (2026-09-13)

Do not integrate the transfer-attachment candidate. QA found
`INV-ATTACH-001`: authenticated admin is `Core3 Demo Company`, but transfer
`WH/IN/00003` is seeded as `My Company`, causing live upload to return 403
`INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED`. Route fixture/company-context
alignment to the existing owner `agent/odoo-ui-inventory-dev4-20260913` in
`/home/nhanjs/projects/core3-worktrees/inventory-dev4-20260913`, then retest
live upload/download. Mobile completion, restart, and paired Odoo remain open;
no replacement or duplicate merge was made.

## Integrated conditional attachment context: `b5bd4325` (2026-09-13)

The Inventory transfer attachment bundle is active as `1540e5f9`, `724f78ec`,
and `f8651357`; `b5bd4325` was empty because its context propagation was
already present. Active verification passed 48/497, audit, Inventory CSS, and
diff-check. Odoo comparison and unrelated Website lint remain open.

## `INV-PACK-001` — Put in Pack (2026-09-20)

- Selected the smallest unfinished source-backed transfer/package workflow:
  Odoo `stock.picking.action_put_in_pack`.
- Implemented YAML-first page/API action contracts, migration `0.0.21`,
  deterministic move fixture, durable package/contents/result relation,
  timeline event, permission, state, duplicate, stale-row, and validation
  boundaries.
- Focused integration: PASS, 3 tests / 18 assertions. Authenticated Core3
  desktop/mobile browser evidence and reload persistence: PASS. Evidence is
  under `plan/odoo-ui-parity/evidence/inventory/2026-09-20/INV-PACK-001/`.
- Authenticated Odoo desktop/mobile source comparison: captured; the reference
  user's `stock.group_tracking_lot` gate hides Put in Pack, so no Odoo write or
  paired action sign-off is claimed.
- Status: bounded Core3 lifecycle ready for review; broader Inventory parity,
  Odoo gated action execution, and remaining wizard semantics stay open.

## `INV-PACK-TRANSFER-001` — Package Transfers evidence gate (2026-09-20)

- Closed the smallest remaining source-backed Inventory gap after Put in Pack:
  authenticated evidence for the existing Odoo `stock.package.action_view_picking`
  Package Transfers stat workflow.
- Source comparison confirmed `stock_package_view_form` exposes the stat button
  and `stock.package.action_view_picking` returns pickings whose move lines use
  the package as source or result; the Packages menu and stat are gated by
  `stock.group_tracking_lot`.
- Existing Core3 YAML page/API separation, durable relation migration,
  permissioned navigation, source/result labels, and restart/permission tests
  were revalidated without widening the implementation scope.
- Focused test: 3 tests / 22 assertions; audit, Inventory CSS build, scoped
  ESLint, and diff-check passed. Authenticated Core3 desktop/mobile evidence
  is under `plan/odoo-ui-parity/evidence/inventory/2026-09-20/INV-PACK-TRANSFER-001/`.
- Odoo desktop/mobile exact blocker evidence is recorded: authenticated
  `codex@core3.local` reaches Discuss instead of `/odoo/packages`, confirming
  the source group gate; no Odoo execution or false parity sign-off is claimed.
- Status: bounded Package Transfers evidence gate complete; broader Inventory
  module sign-off remains open.

## `INV-STOCK-AT-DATE-001` — Stock report Inventory at Date (2026-09-20)

- Compared Odoo `stock.menu_product_stock` / `stock.action_product_stock_view`
  and the `stock.action_inventory_at_date` transient wizard. Odoo's Confirm
  path reopens the product stock list with `to_date` context.
- Replaced the Core3 Stock report's message-only date action with a durable
  `inventory_stock_report_runs` context migration `0.0.23`, an API-owned
  `inventory_stock_report_context` datasource, and a page-owned `StatRow`.
  The page/API split remains joined by `page.id: stock-report`.
- The selected company context now filters the real stock datasource. The
  focused test proves 2026-01-14 empty, 2026-01-16 restored rows, invalid-date
  422, wrong-company 403, unauthorized page 403, idempotent migration, and
  file-backed restart persistence: 4 tests / 50 assertions.
- Fresh authenticated Core3 browser evidence is under
  `evidence/inventory/2026-09-20/INV-STOCK-AT-DATE-001/`; desktop/mobile
  Save/reload retained 2026-01-16 and 10 rows with no failed requests or
  overflow.
- Fresh authenticated Odoo Stock report evidence renders at desktop/mobile;
  desktop opens the wizard, while the 390px responsive surface does not expose
  the date control. This exact responsive comparison boundary is recorded in
  `odoo.json`; no Odoo write was made.
- Status: bounded report-context slice complete for review; full Inventory
  sign-off remains open.

## `INV-OP-TYPES-001` — Operations Types lifecycle (2026-09-20)

- Selected the smallest remaining source-backed configuration gap after the
  completed Settings, Put in Pack, Package Transfers, and Stock at Date slices.
- Reconciled Odoo `stock.action_picking_type_list` / `stock.menu_pickingtype`
  against the installed stock view XML. Repaired Core3's missing list create
  binding and missing create/edit location fields while preserving page/API
  YAML separation.
- Added migration `20260920210000-024-inventory-operation-type-lifecycle.yaml`
  for row-version backfill/default durability. Focused test passes 3 tests / 41
  assertions, including runtime permission denial, CRUD/lifecycle guards, and
  file-backed restart.
- Authenticated Core3 desktop/mobile evidence is complete in
  `evidence/inventory/2026-09-20/INV-OP-TYPES-001/`. Odoo authentication
  succeeds, but `/odoo/action-426` returns the exact generic Odoo `Oops!`
  blocker at both viewports; no paired visual sign-off is claimed.
- Status: bounded Core3 lifecycle complete for review; Odoo action blocker and
  broader Inventory module sign-off remain open.

## `INV-SCRAP-001` — Scrap Orders validation and Product Moves (2026-09-20)

- Selected the smallest remaining source-backed Operations gap. Odoo source
  comparison covers `stock.menu_stock_scrap`, `stock.action_stock_scrap`, the
  Validate action, Draft/Done state, and move/stat semantics.
- Added migration `20260920220000-025-inventory-scrap-lifecycle.yaml`, durable
  Done fixture move rows, API-owned validation side effects, and a page-owned
  Product Moves line grid while preserving YAML page/API separation.
- Focused fixture, CRUD, stale, permission, migration-idempotence, and
  file-backed restart checks pass in the Scrap Orders integration test. An
  initial discovery attempt encountered an unrelated shared-checkout boundary;
  the subsequent full Inventory run passed after its owners repaired it. Those
  paths were not changed or staged by Inventory.
- Authenticated Core3 desktop/mobile and authenticated Odoo desktop/mobile
  evidence is complete under
  `evidence/inventory/2026-09-20/INV-SCRAP-001/`. Odoo renders its Scrap
  Orders action with deterministic source comparison recorded; no Odoo write
  was performed.
- Status: bounded Core3 lifecycle and evidence complete for review; broader
  Inventory sign-off remains open for the full actor matrix and residual source
  behaviors.

## `INV-PHYSICAL-001` — Physical Inventory Apply All (2026-09-20)

- Selected the smallest remaining source-backed gap after Scrap Orders: Odoo's
  Physical Inventory Apply All action and adjustment-name wizard.
- Compared `stock_quant_views.xml`, `stock_quant.py`, and
  `stock_inventory_adjustment_name.py`; Core3 now keeps the page YAML layout
  only, owns the datasources/actions in the matching API YAML, and persists
  adjustment runs in migration `0.0.26`.
- Apply All validates reason/date, rejects an empty counted set, updates only
  counted quants, records deterministic non-zero inventory move history, and
  returns the durable adjustment audit row. Focused coverage passes 4 tests /
  39 assertions; the full Inventory suite passes 61 tests / 627 assertions.
- Authenticated Core3 desktop/mobile and paired authenticated Odoo
  desktop/mobile comparison evidence is complete under
  `evidence/inventory/2026-09-20/INV-PHYSICAL-001/`; no Odoo mutation was
  performed.
- Status: bounded Core3 lifecycle, permissions, restart persistence, and
  evidence complete for review. Broader Inventory sign-off remains open for
  the full actor matrix and residual report/relocation semantics.
