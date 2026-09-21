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

## `INV-MOVES-ANALYSIS-001` — Moves Analysis report (2026-09-20)

- Selected the smallest remaining source-backed report gap: Odoo
  `stock.stock_move_menu` → `stock_move_action`, distinct from the existing
  `stock.move.line` Moves History report.
- Compared `addons/stock/views/stock_move_views.xml:4-25,27-63,320-407,437`.
  Added the Reporting menu, layout-only `pages/moves-analysis.yaml`, matching
  API fragment, and read-only `move-analysis-detail` page/API contract.
- Migration `20260920240000-027-inventory-moves-analysis.yaml` persists eight
  deterministic stock moves across Done, Assigned/Waiting, Incoming,
  Outgoing, Internal, and Inventory states. Focused coverage passes 4 tests /
  41 assertions, including filters, pivot, empty/404/503, permission, and
  restart checks.
- Authenticated Core3 desktop list/pivot/detail and mobile evidence plus
  authenticated Odoo desktop pivot/list and mobile kanban evidence are under
  `evidence/inventory/2026-09-20/INV-MOVES-ANALYSIS-001/`; both runs had no
  browser failures or horizontal overflow.
- Status: bounded report lifecycle complete for review. Full shared runner
  verification is blocked by the unrelated committed Surveys schema boundary;
  no Surveys/Employees/Ecommerce paths were changed or staged.

## `INV-PHYSICAL-RELOCATE-001` — On Hand quant relocation (2026-09-20)

- Selected the smallest remaining source-backed relocation behavior after the
  completed Settings, package/transfer, stock-at-date, operation type, scrap,
  physical inventory, and Moves Analysis slices.
- Compared Odoo `stock.action_view_quants`, the manager-only
  `action_stock_quant_relocate` object action, and `stock.quant.relocate`; the
  source requires positive quantities and active internal destination locations,
  then records a `Quantity Relocated` internal move.
- Added API-owned `stock` relocation action and location options while keeping
  `pages/stock.yaml` layout-only. Migration `0.0.28` persists relocation audits
  and a deterministic opening row. The mutation updates the quant, preserves
  lot metadata, inserts move history, validates stale/same/invalid/conflicting
  destinations, and requires `inventory.manage`.
- Focused test passes 4 tests / 21 assertions, including CRUD/workflow guards,
  permission denial, and file-backed restart persistence.
- Authenticated Core3 desktop/mobile and Odoo desktop/mobile evidence is under
  `evidence/inventory/2026-09-20/INV-PHYSICAL-RELOCATE-001/`; no Odoo write was
  performed. Full module test discovery remains partially blocked by unrelated
  shared-checkout Surveys schema/action-boundary files; Inventory paths were
  not changed to repair that boundary.

Status: bounded Core3 lifecycle and evidence complete for review; broader
Inventory sign-off remains open.

## `INV-PACKAGE-RELOCATE-001` — Package location relocation (2026-09-21)

- Selected the smallest remaining Packages detail gap after package CRUD,
  Unpack, Put in Pack, and Package Transfers: Odoo's non-empty package
  location write behavior. Compared `stock_package_views.xml:29-70` and
  `stock_package.py:289-307`, including the empty-package rejection and
  `Package manually relocated` semantics.
- Core3 keeps `pages/package-detail.yaml` presentation-only and adds the
  `inventory.packages.relocate` server form to `api/package-detail.yaml`.
  Migration `20260921120000-038-inventory-package-relocations.yaml` persists
  relocation history and seeds `PACK/RELOCATE/0005` in Core3 Demo Company.
  Company, actor, non-empty/state, destination, same-location, and
  row-version guards are enforced; the history survives restart.
- Focused verification passes 8 tests / 53 assertions across the new
  relocation suite and existing package suite. Authenticated Core3 desktop/
  mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PACKAGE-RELOCATE-001/` with 1440x900 and
  390x844 list/detail/form/result captures. Odoo live execution was not
  captured; no Odoo mutation or parity sign-off is claimed.

Status: bounded Core3 lifecycle and source comparison complete for review;
full Inventory sign-off remains open.

## `INV-TRANSFER-EMAIL-001` — Transfer email queue (2026-09-21)

- Selected the smallest remaining non-duplicated transfer action after labels:
  Odoo's transfer-bound `action_lead_mass_mail` Send email action. Source
  comparison covers `stock_picking_views.xml:513-523`, the mail composer view
  (`mail_compose_message_views.xml:4-18,55,67-90`), and mass-mail dispatch in
  `mail_compose_message.py:804-807`.
- Core3 keeps page/API YAML separate. Receipts and Deliveries expose a
  permissioned Send email list action; the API owns recipient/subject/body
  validation, current-company/actor/row-version guards, and a durable queued
  email outbox. Migration `20260921110000-037-inventory-transfer-emails.yaml`
  adds the outbox and deterministic `WH/OUT/EMAIL/0001` fixture. Transfer
  detail exposes queued history and timeline attribution.
- Focused verification passes 8 tests / 73 assertions across the email and
  transfer workflow suites, including migration replay, restart persistence,
  permission, actor/company, stale/cancelled, content, and no-partial-state
  guards.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-TRANSFER-EMAIL-001/`; both widths render
  the transfer list and Send email form with no page/request errors or
  horizontal overflow. Odoo live paired execution was not reachable in this
  bounded wave; the exact source comparison is recorded and no Odoo mutation
  is claimed. External SMTP dispatch and Odoo multi-record mass-mail remain
  open follow-ups.

Status: bounded Core3 lifecycle and source comparison complete for review;
full Inventory sign-off remains open.

## `INV-TRANSFER-LABELS-001` — transfer Product Labels report run (2026-09-21)

- Selected the smallest remaining source-backed transfer action after locks,
  backorders, and returns: Odoo's transfer-bound `action_print_labels` report
  action and its `picking.label.type` wizard. Source comparison covers
  `stock_picking_views.xml:477-487`, `stock_picking.py:1984-1995`, and
  `stock_label_type.py:7-29` / `.xml:3-18`.
- Core3 keeps `pages/transfer-detail.yaml` presentation-only and
  `api/transfer-detail.yaml` API/action-owned. The bounded Product Labels/PDF
  form enforces current company, authenticated actor, non-cancelled state,
  positive move lines, and row-version concurrency; it records a durable
  report run, quantity, actor, and timeline event.
- Migration `20260921100000-036-inventory-transfer-labels.yaml` adds the
  durable ledger and deterministic `delivery-labels-0001` fixture. Replay and
  file-backed restart persistence are covered.
- Focused coverage passes 4 tests / 20 assertions in
  `inventory_transfer_labels.integration.test.ts`. Core3 authenticated
  desktop/mobile capture is blocked before listen by the unrelated
  `services/ecommerce/api/wishlist.yaml` discovery error; Odoo visual capture
  was not retried during finalization. Exact blockers and source comparison are
  under `evidence/inventory/2026-09-21/INV-TRANSFER-LABELS-001/`.
- Lot/SN Labels, product label layout options, and ZPL output remain open
  follow-up scope. Full Inventory sign-off remains open.

## `INV-TRANSFER-LOCK-001` — transfer Lock/Unlock actor lifecycle (2026-09-21)

- Selected the smallest remaining non-duplicated transfer behavior: Odoo's
  form-only manager `action_toggle_is_locked` operation.
- Compared `stock_picking_views.xml:490-501` and
  `stock_picking.py:658-661,1529-1532`. Core3 keeps the page/API split,
  exposes a manager-only Lock / Unlock action for non-cancelled transfers,
  persists `is_locked`, and records actor/timeline state. Field-level
  editability changes remain a separate follow-up.
- Migration `20260921090000-035-inventory-transfer-locks.yaml` adds durable
  lock state and defaults existing deterministic fixtures to locked. Company,
  actor, cancelled-state, row-version, permission, and file-backed restart
  guards are covered by the focused lock suite.
- Focused coverage passes 8 tests / 67 assertions across the lock and transfer
  workflow suites. Authenticated Core3 desktop/mobile evidence and paired
  authenticated Odoo comparison/blocker evidence are under
  `evidence/inventory/2026-09-21/INV-TRANSFER-LOCK-001/`.
- Odoo deliveries/receipts rendered without Lock/Unlock for
  `codex@core3.local`; the exact `stock.group_stock_manager` blocker is
  recorded and no Odoo mutation was attempted.

Status: bounded Core3 lifecycle and evidence complete for review; broader
Inventory sign-off remains open.

## `INV-TRANSFER-BACKORDER-001` — partial transfer backorder lifecycle (2026-09-20)

- Selected the smallest remaining non-duplicated transfer workflow: Odoo's
  partial-validation `stock.backorder.confirmation` wizard.
- Compared `stock_picking.py:1413-1492,1568-1603` and
  `stock_backorder_confirmation_views.xml` / `.py`. Core3 keeps the page/API
  split, exposes Create Backorder only for a partial Ready transfer, supports
  Create Backorder and No Backorder, and records actor/company/decision in a
  durable ledger and timeline. The bounded contract accepts exactly one
  partial move line; multi-transfer wizard selection remains open.
- Migration `20260920310000-034-inventory-transfer-backorders.yaml` adds the
  durable backorder relation, decision ledger, linked reverse picking/move,
  and deterministic partial fixture. Company, actor, decision, state,
  row-version, permission, and file-backed restart guards are covered by the
  focused backorder suite.
- Focused coverage passes 8 tests / 75 assertions across the backorder and
  transfer workflow suites. Authenticated Core3 desktop/mobile evidence and
  paired authenticated Odoo comparison/blocker evidence are under
  `evidence/inventory/2026-09-20/INV-TRANSFER-BACKORDER-001/`.
- Odoo deliveries 1-3 expose no partial backorder wizard for
  `codex@core3.local`, and `/odoo/backorders` redirects to Discuss. The exact
  blocker is recorded and no Odoo mutation was attempted.

Status: bounded Core3 lifecycle and evidence complete for review; broader
Inventory sign-off remains open.

## `INV-TRANSFER-RETURN-001` — completed transfer Return lifecycle (2026-09-20)

- Selected the smallest remaining non-duplicated transfer behavior: Odoo's
  completed-picking `Return` action and `stock.return.picking` wizard.
- Compared `stock_picking_views.xml:129-143` and
  `stock_picking_return_views.xml` with `stock_picking_return.py`. Core3 keeps
  the page/API split, exposes Return only for Done transfers, reverses source
  and destination, and records actor/reason/quantity in a durable return
  ledger and timeline. The bounded contract accepts exactly one completed
  source move line; multi-line and exchange wizard semantics remain open.
- Migration `20260920300000-033-inventory-transfer-returns.yaml` adds the
  durable ledger, reverse picking/move fixture, and deterministic completed
  delivery. Company, actor, state, quantity, row-version, permission, and
  file-backed restart guards are covered by the focused return suite.
- Focused coverage passes 8 tests / 73 assertions across the return and
  transfer workflow suites. Authenticated Core3 desktop/mobile evidence and
  paired authenticated Odoo comparison/blocker evidence are under
  `evidence/inventory/2026-09-20/INV-TRANSFER-RETURN-001/`.
- Odoo `/odoo/deliveries/1` through `/odoo/deliveries/10` rendered completed
  delivery forms but did not expose Return, its wizard, or Returns stat for
  `codex@core3.local`; the exact blocker is recorded and no Odoo mutation was
  attempted.

Status: bounded Core3 lifecycle and evidence complete for review; broader
Inventory sign-off remains open.

## INV-TRANSFER-CHECK-AVAILABILITY-001 — transfer reservation lifecycle (2026-09-20)

- Selected the smallest remaining source-backed transfer gap: Odoo
  `stock.picking.action_assign` / `Check Availability`, explicitly left as a
  reservation follow-up by the prior transfer workflow slice.
- Added migration `0.0.32` with durable reservation rows and a deterministic
  company-matched waiting delivery fixture. API/page contracts remain separate;
  line availability now exposes reserved quantity and actor timeline events.
- Check Availability and Unreserve enforce `inventory.write`, company scope,
  current picking row version, valid move lines, available quantity and
  duplicate-reservation guards. Quant reservations, picking revisions, actor,
  and restart state are durable; no cross-module caller was required.
- Focused tests: 8 passed / 73 assertions across reservation and transfer
  workflow suites. Core3 authenticated desktop/mobile evidence is complete with
  no failed requests, page errors, or overflow. Odoo desktop/mobile reached a
  Ready/Available transfer and hid Check Availability; exact blocker evidence
  is recorded, with no Odoo mutation. This slice is complete for review;
  module sign-off remains open.

## `INV-PHYSICAL-RESET-001` — Physical Inventory Clear/reset (2026-09-20)

- Selected the smallest remaining source-backed Physical Inventory behavior
  after Request a Count: Odoo's manager-only Clear action and warning wizard.
- Compared `stock_quant_views.xml:278-321`, `stock_quant.py:531-549`, and
  `stock_inventory_warning.py:7-14`. Core3 keeps the page/API split, adds a
  manager bulk action, and applies the source reset semantics to selected
  quants.
- Migration `20260920270000-030-inventory-count-resets.yaml` persists reset
  headers and selected-quant lines. Company scope, invalid selection, stale
  row-version, manager permission, atomic rollback, and restart persistence
  are covered by the focused suite.
- Focused test passes 4 tests / 20 assertions. Authenticated Core3 and Odoo
  desktop/mobile evidence is under
  `evidence/inventory/2026-09-20/INV-PHYSICAL-RESET-001/`; Odoo Clear is
  group-gated for the supplied user, so no Odoo mutation or sign-off is
  claimed.

Status: bounded lifecycle complete for review; full Inventory sign-off remains
open.

## `INV-LOT-TRACEABILITY-001` — Lot Traceability report (2026-09-20)

- Selected the smallest remaining source-backed report behavior: Odoo's lot
  form Traceability stat action and fixed PDF report contract.
- Compared `stock_lot_views.xml:8-28`,
  `stock_traceability_report_data.xml:4-8`, the stock controller route, and
  `report_stock_traceability.xml:20-38`. Core3 adds a lot-detail Traceability
  route with separate page/API YAML, deterministic report lines, and a fixed
  Print action that records a report run before invoking the browser print
  surface.
- Migration `20260920280000-031-inventory-lot-traceability.yaml` adds durable
  report history and a Core3-company traceable lot/move fixture. Focused tests
  pass 4 tests / 20 assertions, covering context/lines, report CRUD, actor,
  company, stale/empty guards, permission, and restart persistence.
- Authenticated Core3 desktop/mobile and Odoo comparison evidence is under
  `evidence/inventory/2026-09-20/INV-LOT-TRACEABILITY-001/`. Odoo lot-list
  comparison did not expose the selected form/stat action for the supplied
  user; no Odoo mutation or sign-off is claimed.

Status: bounded lifecycle complete for review; full Inventory sign-off remains
open.

## `INV-PHYSICAL-REQUEST-COUNT-001` — Physical Inventory Request a Count (2026-09-20)

- Selected the smallest remaining source-backed Physical Inventory wizard after
  quant relocation and Moves Analysis: Odoo's manager-only Request a Count.
- Compared `stock.menu_action_inventory_tree` / `stock.action_view_inventory_tree`,
  `stock.action_stock_request_count`, and `stock.request.count`. The source
  writes a scheduled inventory date and optional stock-user assignee to the
  selected quants and leaves counted quantities unapplied.
- Added a selectable Core3 Physical Inventory list bulk action, API-owned form
  fields/catalog/history, and migration `0.0.29` request header/line tables with
  deterministic seed data. The transaction enforces internal/transit selection,
  valid date/user, rollback, durable audit, and `inventory.manage`.
- Focused test passes 4 tests / 21 assertions. Authenticated Core3 desktop/
  mobile and Odoo desktop/mobile evidence is under
  `evidence/inventory/2026-09-20/INV-PHYSICAL-REQUEST-COUNT-001/`.
- The supplied authenticated Odoo user can open Physical Inventory but is not in
  the manager group, so Request a Count is not visible; the exact blocker is
  recorded rather than treated as parity sign-off. No Odoo mutation was made.

Status: bounded Core3 lifecycle and evidence complete for review; broader
Inventory sign-off remains open.
## `INV-STOCK-FORECAST-001` — Forecasted Report (2026-09-21)

- Selected the next uncovered source-backed Stock behavior: Odoo's product
  `View Availability` object action and `Forecasted Report` client action.
- Added paired `stock-forecast` page/API YAML, Stock report row navigation,
  durable deterministic forecast lines/report-run history, and refresh guards
  for permission, company, actor, empty data, and row-version concurrency.
- Focused verification: 12 tests / 97 assertions across forecast, Stock report,
  and package relocation; `bun run audit` passed and `git diff --check` passed.
- Authenticated Core3 desktop/mobile evidence is complete under
  `evidence/inventory/2026-09-21/INV-STOCK-FORECAST-001/`. Odoo login was
  reachable but the authenticated Stock report route did not complete within
  the bounded browser capture; see `blockers.md`. Full module sign-off remains
  open.
## `INV-STOCK-LOCATIONS-001` — Stock product Locations (2026-09-21)

- Selected the next uncovered source-backed Stock behavior: the product-row
  Locations action (`stock.action_view_quants`) with its internal-location and
  product context.
- Added paired `stock-locations` page/API YAML, durable report-run history,
  deterministic quant-backed product location data, and company/actor/
  non-empty/row-version guards without duplicating Locations CRUD or quant
  relocation.
- Focused verification: 8 tests / 76 assertions across the Locations and
  Stock report suites. Core3 authenticated desktop/mobile evidence is complete
  under `evidence/inventory/2026-09-21/INV-STOCK-LOCATIONS-001/`.
- Odoo Stock desktop/mobile rendered with no failed requests, but the supplied
  account did not expose the source `stock.group_stock_multi_locations` button;
  exact paired evidence/blocker is recorded. Full module sign-off remains open.

## `INV-PRODUCT-REPLENISH-001` — Product Replenish wizard (2026-09-21)

- Selected the next uncovered source-backed product operation after Stock
  Forecast and Stock Locations: Odoo's product form `Replenish` action opening
  the `product.replenish` wizard.
- Compared `addons/stock/views/product_views.xml:39-85` with
  `addons/stock/wizard/product_replenish_views.xml:3-61` and
  `product_replenish.py:9-115`. Core3 adds paired product-replenish page/API,
  Stock row navigation, product/forecast context, warehouse/route catalogs,
  and a durable Confirm request ledger.
- Migration `20260921150000-041-inventory-product-replenishment.yaml` seeds
  deterministic data. Guards cover product/company, authenticated actor,
  expected product row version, positive quantity, scheduled date, active
  warehouse, and route.
- Focused verification passes 8 tests / 76 assertions across the new wizard
  and Stock report regression. Evidence is under
  `evidence/inventory/2026-09-21/INV-PRODUCT-REPLENISH-001/`; downstream Odoo
  procurement remains open and full module sign-off is not claimed.

## `INV-REPLENISH-INFO-001` — Replenishment Information (2026-09-21)

- Added the source-backed Replenishment Information workflow after Product
  Replenish: product/warehouse forecast context, Forecast Description demand
  chart, durable report-open history, route catalog, and Save Rule min/max/route
  persistence.
- Kept page/API YAML separate and joined by `page.id`; migration 0.0.42 seeds
  deterministic demand and run history. Company, actor, permission, range,
  route, and row-version guards are covered by focused tests and restart reads.
- Focused suite: 7 tests / 57 assertions. Authenticated Core3 desktop/mobile
  and Odoo desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-REPLENISH-INFO-001/`; Odoo's reachable
  account did not expose the source information action. Full module sign-off
  remains open.

## `INV-ROUTES-001` — Warehouse Management Routes (2026-09-21)

- Selected the next uncovered configuration behavior: Odoo Inventory >
  Configuration > Warehouse Management > Routes, backed by `stock.route` and
  its `stock.rule` relation.
- Added separate Routes list/detail page and API YAML contracts joined by
  `page.id`, migration `20260921170000-043-inventory-routes.yaml`, deterministic
  route/rule fixtures, and manager-gated create/edit/archive/restore/delete
  lifecycle with company, actor, and row-version guards.
- Focused route tests pass 4 tests / 36 assertions, including migration replay,
  company filtering, permission boundaries, CRUD, and restart reads. Core3
  authenticated desktop/mobile evidence is in
  `evidence/inventory/2026-09-21/INV-ROUTES-001/`.
- Odoo source/menu comparison is complete, but the supplied account lacks
  `stock.group_adv_location`; Routes is absent from the reachable Configuration
  menu. The blocker is recorded and full Inventory sign-off remains open.

## `INV-PUTAWAY-RULES-001` — Warehouse Management Putaway Rules (2026-09-21)

- Selected the next uncovered source-backed configuration workflow after
  Storage Categories: Odoo `stock.putaway.rule`, including product/category
  targeting, arrival/store locations, package/storage context, and sublocation
  strategy.
- Added separate Putaway Rules list/detail page and API YAML contracts joined
  by `page.id`, migration `20260921190000-045-inventory-putaway-rules.yaml`,
  deterministic rules, and `inventory.multi_location` read / `inventory.manage`
  mutation boundaries.
- Focused verification passes 4 tests / 33 assertions, covering discovery,
  deterministic filters and context, target/strategy/location/company guards,
  CRUD, archive/restore, concurrency, migration replay, and restart reads.
  Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PUTAWAY-RULES-001/`.
- The bounded Odoo probe stayed on `/web/login` for both viewports, so live
  Odoo menu/record interaction is not claimed. Source/menu/group comparison
  and blocker are recorded; full Inventory sign-off remains open.

## `INV-STORAGE-CATEGORIES-001` — Warehouse Management Storage Categories (2026-09-21)

- Selected the next uncovered source-backed configuration workflow after
  Routes: Odoo `stock.storage.category`, including its product/package capacity
  rules and Locations stat action.
- Added separate Storage Categories list/detail page and API YAML contracts
  joined by `page.id`, migration `20260921180000-044-inventory-storage-categories.yaml`,
  deterministic category/capacity/location fixtures, and the
  `inventory.multi_location` menu/read boundary with `inventory.manage`
  mutations.
- Focused verification passes 4 tests / 35 assertions, covering discovery,
  deterministic fixtures, current-company scope, category and capacity CRUD,
  in-use/duplicate/invalid guards, permissions, migration replay, and restart
  persistence. Core3 authenticated desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-STORAGE-CATEGORIES-001/`.
- Odoo source comparison is complete, but the bounded live probe failed at
  `POST /web/login` for the supplied account; no authenticated Odoo state or
  mutation is claimed. Full Inventory sign-off remains open.

## `INV-OVERVIEW-001` — Inventory Overview operation cards (2026-09-21)

- Selected the smallest uncovered source-backed root workflow after the
  completed configuration/report slices: Odoo's
  `stock_picking_type_action` operation-card overview.
- Added separate page/API YAML joined by `page.id`, deterministic counters
  from operation types/pickings/moves, durable overview-open history migration
  0.0.46, and a queue form covering All, Ready, Waiting, Late, Back Orders,
  and Operations.
- Focused verification passes 4 tests / 22 assertions. Guards cover
  `inventory.read`, actor, company alias/scope, valid filters, row-version
  concurrency, and file-backed restart reads.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-OVERVIEW-001/`; authenticated Odoo
  desktop/mobile source comparison is also present. Odoo counts differ from
  Core3 deterministic fixtures and one unrelated mobile avatar request abort
  is recorded. Source New/configuration/report card actions remain open, and
  full Inventory sign-off remains open.

## `INV-PRODUCT-VARIANTS-001` — Inventory Product Variants (2026-09-21)

- Selected the next uncovered source-backed Inventory Products action after
  Overview: `stock.product_product_menu` / `stock_product_normal_action`, the
  `product.product` Product Variants list/form/kanban with stock columns.
- Added durable migration `20260921210000-047-inventory-product-variants.yaml`,
  deterministic stock-facing variants, and separate list/detail page/API YAML
  contracts joined by `page.id`. The lifecycle includes manager create/edit,
  archive/restore/delete, current-company/shared read scope, duplicate and
  stock-in-use guards, and row-version checks.
- Focused verification: 4 tests / 29 assertions pass. `bun run audit` passes
  at 708 pages, 717 routes, and 1,349 datasources; scoped ESLint and
  `git diff --check` pass.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PRODUCT-VARIANTS-001/`. Odoo credentials
  authenticate, but `/odoo/action-434` redirects to Discuss at desktop and
  mobile; source comparison and exact blocker are recorded. Full Inventory
  sign-off remains open.

## `INV-UNITS-PACKAGINGS-001` — Inventory Units & Packagings (2026-09-21)

- Selected the next uncovered Inventory Configuration > Products action:
  `stock.menu_stock_uom_form_action` → `uom.product_uom_form_action`, the
  source `uom.uom` list/form for Units & Packagings.
- Added migration `20260921220000-048-inventory-units-packagings.yaml`,
  deterministic base/derived/shared/archived fixtures, and separate list/detail
  page/API YAML joined by `page.id`. Manager actions enforce positive factors,
  valid reference relationships, company scope, duplicate names, in-use and
  dependent guards, archive/restore, and row versions.
- Focused verification: 4 tests / 35 assertions pass. Audit passes at 710
  pages, 719 routes, and 1,353 datasources; scoped ESLint and `git diff --check`
  pass.
- Authenticated Core3 desktop/mobile list/detail and Odoo `/odoo/action-90`
  desktop/mobile evidence are under
  `evidence/inventory/2026-09-21/INV-UNITS-PACKAGINGS-001/`. Core3 New-form
  rendering was not claimed; Odoo source list renders 21 rows. Full Inventory
  sign-off remains open.

## `INV-PACKAGE-TYPES-001` — Inventory Package Types (2026-09-21)

- Selected the next genuinely uncovered source-backed Inventory configuration
  workflow after excluding product variants, units/packagings, transfers,
  package relocation, forecast, locations, replenishment, routes, storage
  categories, putaway, and overview: Odoo `menu_packaging_types` →
  `action_package_type_view` for `stock.package.type`.
- Added durable migration `20260921230000-049-inventory-package-types.yaml`,
  deterministic reusable/disposable/shared fixtures, and separate list/detail
  page/API YAML joined by `page.id`. Manager CRUD enforces package use,
  dimension/weight and barcode constraints, company scope, row versions, and
  in-use deletion guards across packages, capacities, routes, and contents.
- Focused verification: 4 tests / 33 assertions pass. Authenticated Core3
  desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PACKAGE-TYPES-001/`; both viewports have
  HTTP 200 page/source requests, no page errors, and no horizontal overflow.
- `bun run audit` passes at 712 pages, 721 routes, and 1,359 datasources;
  scoped ESLint and `git diff --check` pass.
- Odoo source/menu comparison is complete; live Odoo returned HTTP 303 to
  `/web/login` without an available authenticated session, so paired Odoo
  visual/CRUD evidence is blocked and not claimed. Full Inventory sign-off
  remains open.

## `INV-PRODUCT-CATEGORIES-001` — Inventory Product Categories (2026-09-21)

- Selected the smallest genuinely uncovered Wave 13 Inventory behavior after
  excluding product variants, units/packagings, package types, transfer/package
  slices, stock forecast/locations, replenishment, routes, storage categories,
  putaway, and overview: Odoo `menu_product_category_config_stock` →
  `product_category_action_form` for global `product.category`.
- Added durable migration `20260922000000-050-inventory-product-categories.yaml`,
  deterministic hierarchical fixtures, and separate list/detail page/API YAML
  joined by `page.id`. Category CRUD covers valid parents, duplicate siblings,
  descendant-aware product counts, cycle prevention, safe deletion, and row
  versions; the Products stat filters the existing Product Variants page.
- Focused verification: 4 tests / 39 assertions pass. Authenticated Core3
  desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PRODUCT-CATEGORIES-001/`; both viewports
  have HTTP 200 page/source requests, no page errors, and no horizontal
  overflow.
- Direct Inventory contract validation, scoped ESLint, and diff-check pass.
  Repository `bun run audit` remains blocked by the pre-existing Employees
  `actions[11].result is not allowed` error; no other owner file was changed.
  Odoo source/menu comparison is complete, but live Odoo returned HTTP 303 to
  `/web/login`; paired Odoo visual/CRUD evidence is blocked and not claimed.
Full Inventory sign-off remains open.

## `INV-LOT-LOCATIONS-001` — Lot/Serial Number Locations (2026-09-21)

- Selected the next uncovered source-backed lot workflow: Odoo's Lot/Serial
  Number form `Location` stat action, `stock.lot.action_lot_open_quants`.
  This is distinct from lot Traceability, product Stock Locations, and quant
  Move History.
- Added migration `20260922150000-065-inventory-lot-locations.yaml` with a
  deterministic Core3 Demo Company lot quant and durable location-report
  history. Added separate `lot-locations` page/API YAML joined by `page.id`
  and bound the action from the lot detail pair.
- Focused verification passes 4 tests / 31 assertions for source/schema
  comparison, deterministic location/history queries, permission/company/
  actor/stale/empty guards, migration replay, and file-backed restart.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-LOT-LOCATIONS-001/`; both captures have
  empty browser error/HTTP failure lists and no horizontal overflow.
- Odoo live comparison is blocked by HTTP 303 to `/web/login`; the exact
  response is recorded in paired evidence. Full Inventory sign-off remains
  open.

## `INV-TRANSFER-PACKAGE-HISTORY-001` — Done Transfer Package History (2026-09-21)

- Selected Odoo's uncovered Done-transfer `action_see_package_histories`
  list after package barcode, keeping package history distinct from package
  transfers, relocation/removal, and barcode reporting.
- Added migration `20260922130000-063-inventory-transfer-package-history.yaml`
  with a deterministic Done transfer, package, package contents, move link,
  and package-history row. Added separate page/API YAML joined by
  `page.id: transfer-package-history`; the transfer detail now exposes its
  permissioned Packages stat and context navigation.
- Focused verification passes 4 tests / 31 assertions for source comparison,
  deterministic package/search/Main Packages results, Done/company/read
  boundaries, migration replay, and file-backed restart persistence.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-TRANSFER-PACKAGE-HISTORY-001/`.
  Odoo comparison is blocked by the supplied HTTP 303 login redirect; full
  Inventory sign-off remains open.

## `INV-PRODUCT-ATTRIBUTES-001` — Inventory Product Attributes (2026-09-21)

- Selected the next uncovered source-backed Inventory configuration workflow
  after Categories: Odoo `menu_attribute_action` → `product.attribute_action`
  for the product attribute list/form and inline `product.attribute.value`
  values. The source is gated by `product.group_product_variant` and exposes
  display type, variant creation policy, Products stat, and value editing.
- Added migration `20260922010000-051-inventory-product-attributes.yaml`,
  deterministic active/archived attributes and values, and separate list/
  detail page/API YAML contracts joined by `page.id`. Manager CRUD enforces
  duplicate names, supported source choices, the multi-checkbox/no-variant
  constraint, used-on-products archive/delete guards, value uniqueness and
  price validation, and optimistic row versions.
- Focused verification passes 4 tests / 43 assertions, including direct
  contract validation, source-shaped fixtures, permissions, CRUD/guards,
  migration replay, and file-backed restart persistence. Core3 desktop/mobile
  evidence is under
  `evidence/inventory/2026-09-21/INV-PRODUCT-ATTRIBUTES-001/`.
- Odoo source/menu comparison is complete. The bounded live probe result and
  any exact login/group blocker are recorded in paired evidence; no Odoo
  mutation or full Inventory sign-off is claimed.
## `INV-PRODUCT-TEMPLATES-001` — Inventory Products (2026-09-21)

- Selected the next genuinely uncovered source-backed Inventory action after
  Product Attributes: Odoo `product_template_action_product`, the root
  Products `product.template` kanban/list/form. This is distinct from the
  completed Product Variants slice and does not duplicate variant CRUD.
- Added migration `20260922020000-052-inventory-product-templates.yaml`,
  deterministic active/archived/shared product templates, and separate list/
  detail page/API YAML contracts joined by `page.id`. The lifecycle includes
  manager CRUD/archive/restore/delete, current-company/shared scope, duplicate
  references, product type/tracking and numeric validation, variant-delete
  guards, row versions, and stock/variant summaries from existing variants.
- Focused verification passes 4 tests / 42 assertions, including contract
  separation, deterministic aggregates, permission/company/type guards, CRUD,
  migration replay, row versions, and file-backed restart persistence.
  Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PRODUCT-TEMPLATES-001/`.
- Odoo source/menu comparison is complete; paired live evidence records the
  authenticated result or exact route/login blocker. No Odoo mutation or full
  Inventory sign-off is claimed.

## `INV-TRANSFER-SCRAP-001` — Transfer-bound Scrap wizard (2026-09-21)

- Selected the smallest uncovered operation after the product configuration
  waves: Odoo's `stock.action_scrap` form action on `stock.picking`, which
  calls `button_scrap()` from a transfer. This does not duplicate the existing
  standalone Scrap Orders lifecycle.
- Added migration `20260922030000-053-inventory-transfer-scrap.yaml`, a
  deterministic open delivery fixture, durable scrap-run history, and the
  separate transfer-detail page/API contracts joined by `page.id`.
- The action creates a Draft `inventory_scrap_orders` row, a transfer-bound
  run, actor timeline message, and source row-version update. Company scope,
  signed-in actor, open-state, positive-quantity/location, and stale-row
  guards are covered, with read/write permission enforcement and restart
  persistence.
- Focused verification: 4 tests / 23 assertions pass. Authenticated Core3
  desktop/mobile evidence and the exact Odoo live blocker are under
  `evidence/inventory/2026-09-21/INV-TRANSFER-SCRAP-001/`. Scoped audit,
  lint, and diff-check results are recorded with the evidence. Full Inventory
  sign-off remains open.

## `INV-MOVE-REVERT-001` — Revert Inventory Adjustment (2026-09-21)

- Selected the next uncovered source-backed behavior after transfer Scrap:
  Odoo's `action_revert_inventory_adjustment` server action on Moves History
  move lines, which calls `action_revert_inventory()`. This extends the
  existing report without duplicating its list/detail lifecycle.
- Added migration `20260922040000-054-inventory-move-revert.yaml`, durable
  reversal history, and separate move-line detail page/API contracts joined by
  `page.id`. The manager-only action creates a completed reverse move with
  swapped locations and an `[reverted]` reference.
- Guards require `inventory.manage`, current company, signed-in actor, a
  current completed inventory adjustment, positive quantity, and no prior
  reversal; source row versions and restart persistence are covered.
- Focused verification: 4 tests / 24 assertions pass. Authenticated Core3
  desktop/mobile evidence and the exact Odoo live blocker are under
  `evidence/inventory/2026-09-21/INV-MOVE-REVERT-001/`. Full Inventory
  sign-off remains open.

## `INV-PACKAGE-REMOVE-001` — Package Remove from Transfer (2026-09-21)

- Selected the next uncovered source-backed package behavior after Move
  Revert: Odoo's deferred editable transfer-pack `action_remove_package`,
  implemented by `stock.package.action_remove_package`. This is distinct from
  completed package relocation and package-detail Unpack.
- Added migration `20260922050000-055-inventory-package-remove.yaml`, a
  same-company open-transfer fixture, durable package-removal history, and
  separate package-detail page/API contracts joined by `page.id`.
- The manager/write action removes package move-line links for a selected open
  transfer, records removed-count/actor/reason history, advances the package
  row version, and enforces company, actor, transfer-state, relation, and
  stale guards. Restart and permission boundaries are covered.
- Focused verification: 4 tests / 24 assertions pass. Authenticated Core3
  desktop/mobile evidence and the exact Odoo live blocker are under
  `evidence/inventory/2026-09-21/INV-PACKAGE-REMOVE-001/`. Full Inventory
  sign-off remains open.

## `INV-OP-TYPE-READY-MOVES-001` — Operation Type Ready Moves (2026-09-21)

- Selected the next uncovered operation-type workflow after package removal:
  Odoo's operation-type kanban Operations link invokes
  `get_action_picking_type_ready_moves`, which opens
  `stock.action_get_picking_type_ready_moves` on `stock.move` with the active
  picking type domain and Ready search context.
- Added migration `20260922060000-056-inventory-operation-ready-moves.yaml`
  with a deterministic same-company Ready transfer/move fixture. Added the
  separate `operation-type-ready-moves` page/API contracts, joined by
  `page.id`, with operation-type context, company-scoped unfinished Ready
  moves, responsive list/card views, and a detail-page Operations drilldown.
- Focused verification covers exact Odoo action/domain/context markers,
  discovery/schema validation, deterministic query filtering, read permission,
  company boundary, migration replay, and file-backed restart persistence.
  Authenticated Core3 desktop/mobile evidence and the paired Odoo live result
  are recorded under
  `evidence/inventory/2026-09-21/INV-OP-TYPE-READY-MOVES-001/`.
- Full Inventory sign-off remains open; this slice does not claim Odoo CRUD
  mutation parity for the source read/report action.

## `INV-WAREHOUSE-RESUPPLY-001` — Warehouse Resupply From (2026-09-21)

- Selected the next uncovered warehouse behavior after Operation Type Ready
  Moves: Odoo's same-company `resupply_wh_ids` Warehouse Configuration setting,
  implemented through `stock_wh_resupply_table`. This does not duplicate the
  completed Routes configuration slice.
- Added migration `20260922070000-057-inventory-warehouse-resupply.yaml`, a
  deterministic Main → Overflow relation, and manager-only Add/Remove line-item
  actions on the existing warehouse detail API. The page/API remain separated
  by `page.id: warehouse-detail` and expose a responsive Resupply From list,
  same-company options, parent/link row-version guards, actor checks, and
  restart-safe persistence.
- Focused verification passes 4 tests / 29 assertions. Authenticated Core3
  desktop/mobile detail and Add form evidence plus the exact Odoo live result
  are under
  `evidence/inventory/2026-09-21/INV-WAREHOUSE-RESUPPLY-001/`.
- Automatic Odoo route generation is intentionally outside this bounded
  setting slice; full Inventory sign-off remains open.

## `INV-TRANSFER-PRINT-001` — Transfer Print reports (2026-09-21)

- Selected the smallest uncovered transfer/report behavior after warehouse
  Resupply From: Odoo's state-specific transfer-form Print actions. Ready uses
  `stock.picking.do_print_picking` and `stock.action_report_picking`; Done uses
  the bound `stock.action_report_delivery` Delivery Slip report.
- Added migration `20260922080000-058-inventory-transfer-print.yaml` with a
  DuckDB-compatible `printed` column, durable print-run ledger, and deterministic
  Ready/Done fixtures. Existing transfer-detail page/API YAML remains separated
  and joined by `page.id: transfer-detail`.
- Core3 exposes state-specific Print actions and print history. Ready persists
  `printed = TRUE`; both paths record report name/action, PDF output, actor,
  timeline, company, and row-version guards. Focused tests cover source
  mapping, durable lifecycle, state/company/actor/move-line/stale guards,
  permission, migration replay, and file-backed restart.
- Verification: feature suite 4 tests / 35 assertions; full transfer regression
  suite 4 tests / 50 assertions; audit PASS at 723 pages / 732 routes /
  1,402 datasources; scoped ESLint and diff-check PASS.
- Authenticated Core3 desktop/mobile Ready and Done evidence is under
  `evidence/inventory/2026-09-21/INV-TRANSFER-PRINT-001/`. Odoo paired visual
  and action evidence is blocked by HTTP 303 to `/web/login`; no Odoo parity or
  module sign-off is claimed.

## `INV-TRANSFER-DETAILED-OPS-001` — Transfer Detailed Operations (2026-09-21)

- Selected the smallest uncovered transfer-context behavior after Transfer
  Print: Odoo's transfer-form `Moves` stat action, `action_detailed_operations`,
  which opens a picking-scoped `stock.move.line` list rather than the global
  Moves History action.
- Added migration `20260922090000-059-inventory-transfer-detailed-operations.yaml`
  with durable `inventory_move_lines.picking_id` linkage, idempotent matching
  updates, and a deterministic Core3 Demo Company detailed-operation fixture.
  Added separate `transfer-detailed-operations` page/API contracts joined by
  `page.id`; the transfer detail's `Moves` stat passes `picking_id` context.
- The read contract enforces inventory.read, current-company scope, stable
  picking filtering/search/order, explicit empty/503 states, and navigation to
  the existing move-line detail. No page-local SQL or management action was
  added.
- Focused verification passes 4 tests / 28 assertions. Transfer print plus
  workflow regression passes 8 tests / 85 assertions. `bun run audit` passes
  at 725 pages / 734 routes / 1,407 datasources. Core3 authenticated desktop
  and mobile evidence is under
  `evidence/inventory/2026-09-21/INV-TRANSFER-DETAILED-OPS-001/` with no page
  errors, HTTP >=400 responses, or horizontal overflow.
- Odoo source comparison is recorded; live Odoo returned HTTP 303 to
  `/web/login?redirect=%2Fweb%3F`, so paired authenticated Odoo visual/action
  evidence is blocked and not claimed. Full Inventory sign-off remains open.

## `INV-TRANSFER-NEXT-001` — Transfer Next Transfers (2026-09-21)

- Selected the next uncovered transfer-context behavior after Detailed
  Operations: Odoo's transfer-form `action_next_transfer` stat action. The
  source view is `addons/stock/views/stock_picking_views.xml:197-204`; the
  source model derives move-destination pickings, excludes returns, and opens
  one form or a `Next Transfers` list at
  `addons/stock/models/stock_picking.py:1024-1030,1238-1258`.
- Added migration `20260922100000-060-inventory-transfer-next.yaml`, durable
  source/next link data, deterministic same-company fixtures, and separate
  `transfer-next` page/API YAML joined by `page.id`. Transfer detail now
  exposes the permissioned contextual stat and source-picking navigation.
- Focused verification passes 4 tests / 31 assertions, including source
  comparison, API/page contract separation, return exclusion, read/company
  boundaries, migration replay, and file-backed restart persistence.
  Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-TRANSFER-NEXT-001/`.
- Odoo live comparison is blocked by HTTP 303 to `/web/login`; the exact
  response is recorded in `odoo-blocker.json`. Full Inventory sign-off remains
  open.

## `INV-TRANSFER-LOT-LABELS-001` — Transfer Lot/SN Labels (2026-09-21)

- Selected the smallest explicit residual after Product Labels: Odoo's
  `action_print_labels` Lot/SN wizard branch. Source comparison covers
  `stock_label_type.py` and `stock_lot_label_layout.py`, including one-per-lot,
  one-per-unit, 4 x 12, and ZPL choices.
- Added migration `20260922110000-061-inventory-transfer-lot-labels.yaml`
  with durable tracked-lot lines linked to `delivery-labels-0001`. The existing
  paired `transfer-detail` page/API contracts now expose Lot/SN mode, quantity,
  and output format; label history records the resulting mode/count/output.
- Focused verification passes 4 new tests / 27 assertions and 4 Product Labels
  regression tests / 23 assertions. Coverage includes source/schema checks,
  one-per-lot and one-per-unit CRUD, company/actor/format/stale/no-lot guards,
  permission, migration replay, and restart persistence.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-TRANSFER-LOT-LABELS-001/`. Odoo runtime
  comparison is blocked by HTTP 303 to `/web/login`; the exact response is
  recorded. Full Inventory sign-off remains open.

## `INV-PACKAGE-BARCODE-001` — Package Barcode with Contents (2026-09-21)

- Selected the next genuinely uncovered source-backed package behavior after
  transfer Lot/SN Labels: Odoo's `stock.action_report_package_barcode` bound
  PDF report on `stock.package`. The source comparison covers the Packages
  menu/action, report binding, and barcode-with-contents template.
- Extended the existing separated `package-detail` page/API pair with a
  tracking-permission `Print Barcode` action and barcode report history list.
  Migration `20260922120000-062-inventory-package-barcode.yaml` persists
  company-scoped report runs, content count, actor, PDF action/name, and
  row-version state.
- Guards cover current company, authenticated actor, non-empty current package,
  and stale row versions. Focused verification passes 4 tests / 27 assertions,
  including migration replay, restart persistence, and permission boundary.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-PACKAGE-BARCODE-001/`; Odoo live
  comparison is blocked by HTTP 303 to `/web/login?redirect=%2Fweb%3F` and is
  recorded in the paired blocker file. Full Inventory sign-off remains open.

## `INV-QUANT-MOVE-HISTORY-001` — On Hand Quant Move History (2026-09-21)

- Selected Odoo's uncovered On Hand quant-row `History` action
  `stock.quant.action_view_stock_moves`, distinct from the global Moves
  History, Moves Analysis, lot traceability, and stock-location slices.
- Added migration `20260922140000-064-inventory-quant-move-history.yaml`
  with deterministic Core3 Demo Company completed movement fixtures and a
  durable quant-history run ledger. Added separate page/API YAML joined by
  `page.id: quant-history`; the On Hand row action supplies `quant_id`.
- Focused verification passes 4 tests / 38 assertions for source mapping,
  product/location/lot/company filtering, actor/company/stale/empty guards,
  migration replay, restart persistence, and read permission denial.
- Authenticated Core3 desktop/mobile evidence is under
  `evidence/inventory/2026-09-21/INV-QUANT-MOVE-HISTORY-001/`. Odoo comparison
  is blocked by the supplied HTTP 303 login redirect; full Inventory sign-off
  remains open.

## `INV-LOT-TRANSFERS-001` — Lot / Serial Number Transfers (2026-09-21)

- Selected the smallest uncovered lot-context behavior after Lot Locations:
  Odoo's `stock.lot.action_lot_open_transfers` Transfers stat action. The
  source derives outgoing delivery pickings from completed lot move lines and
  opens one delivery as a form or multiple deliveries as a list/form action.
- Added migration `20260922160000-066-inventory-lot-transfers.yaml` with a
  deterministic outgoing serial-lot delivery and durable transfer-open
  history. Added separate `lot-transfers` page/API contracts joined by
  `page.id`; the lot detail pair exposes the tracking-permission Transfers
  action and rows navigate to the existing transfer detail.
- Focused verification passes 4 feature tests / 30 assertions, plus the
  adjacent lots, locations, and traceability regressions. Coverage includes
  source comparison, discovery, deterministic search/empty/transport states,
  actor/company/stale/outgoing guards, migration replay, restart persistence,
  and tracking permission.
- Core3 browser evidence is explicitly blocked for this wave because the
  bounded authenticated headless probe reached only the login shell; its
  desktop/mobile login captures are not an authenticated visual pass. Odoo
  returned HTTP 303 to `/web/login?redirect=%2Fweb%3F`; exact
  blockers are recorded under
  `evidence/inventory/2026-09-21/INV-LOT-TRANSFERS-001/`. Full Inventory
  sign-off remains open.
