# Inventory QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/inventory-desktop.png and inventory-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
Trigger: feature-complete
Candidate commit: `HEAD` (`SettingsView mutation transport retest`)
Runtime: `http://127.0.0.1:3316`, isolated Inventory runner
Authenticated user: `admin@tms.local`

## Settings acceptance matrix

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| INV-SET-01 | Manager-only menu, page/API `page.id`, SettingsView fields | PASS | `inventory_settings.integration.test.ts`; authenticated desktop/mobile render |
| INV-SET-02 | Deterministic settings defaults and idempotent migration | PASS | focused integration test, migration `0.0.17` |
| INV-SET-03 | Direct persisted update increments row version | PASS | authenticated `/api/mutate` response; repository mutation assertions |
| INV-SET-04 | Stale row version returns 409 | PASS | focused integration test |
| INV-SET-05 | Missing settings returns 404 | PASS | focused integration test |
| INV-SET-06 | Desktop render at 1440x900, no failed requests/errors/overflow | PASS | `/tmp/core3-inventory-settings-desktop.png`; Playwright state |
| INV-SET-07 | Mobile render at 390x844, no failed requests/errors/overflow | PASS | `/tmp/core3-inventory-settings-mobile.png`; Playwright state |
| INV-SET-08 | Authenticated Save click persists changed checkbox | PASS | Playwright POST `/api/mutate` includes `values`; Save succeeds and reload preserves the changed checkbox |
| INV-SET-09 | Odoo paired desktop/mobile visual comparison | PARTIAL / blocker recorded | Authenticated Settings action at both viewports returns the exact `ir.actions.server(445)` RPC traceback in `evidence/inventory/2026-09-20/INV-SETTINGS-001/odoo.json` |

## Current route and reference evidence (2026-09-12)

- Focused Inventory suite: `bun test ./test/inventory*.integration.test.ts --timeout 20000` — 39 passed, 0 failed, 439 assertions across 13 files.
- Fresh module-scoped authenticated route matrix: 24 routes × desktop/mobile = 48/48 passed with valid seeded detail IDs, no page errors, HTTP failures, or horizontal overflow; raw result: `/tmp/inventory-matrix-isolated.json`.
- Current paired Packages capture: Core3 and Odoo rendered at desktop/mobile under `/tmp/core3-odoo-parity/paired-inventory-20260912/`. Core3 had no failures; Odoo mobile recorded three navigation-aborted/avatar requests and no page errors, so this is comparison evidence rather than a clean zero-failure pair.

## Transfer functional evidence (2026-09-12)

- Fresh authenticated Admin workflow on port 4026 passed for receipt
  `receipt-00003`: `Draft` → `Waiting` (confirm, row version 1 → 2) →
  `Ready` (check availability, 2 → 3) → `Done` (validate, 3 → 4).
- Validation persisted move completion (`done_quantity = quantity`) and
  inserted the transfer timeline message. A stale cancel attempt returned the
  declared 409 guard after the transfer was complete.
- The fleet user (`fleet@tms.local`) was denied the same confirm mutation with
  the declared 403 `inventory.write` permission boundary.
- This proves one end-to-end state transition and permission boundary through
  the authenticated mutation transport. The transfer edit contract was then
  repaired: `Edit details` now opens the declared fields, Save posts
  `inventory.pickings.update`, and a reload preserved the changed contact.
- Remaining transfer CRUD interaction, the other operation kinds, and full
  Odoo workflow parity remain open.

The previous Odoo-session blocker is superseded for the current reference. The
Settings pair and remaining Inventory visual/interaction gates are still open.

## Dispatch notes

The shared action transport retest, transfer edit persistence, and one
authenticated transfer workflow pass.
Keep the module open until the remaining Odoo paired surfaces, full Inventory
CRUD/workflow browser checks, and migration-contract decision are complete.

Detailed execution matrix: [`test-plans/inventory.md`](test-plans/inventory.md). It is the module-level source for transfer, stock, product, report, actor, persistence, Temporal, and paired Odoo gates.

## Rebased candidate review

- The CRUD product changes were rebased onto active checkout `a7088525`.
- The active transfer edit action remains first in the form contract and its
  existing test expectation is preserved; Draft Delete is an additional
  permissioned action.
- Receipt-create/Draft-delete browser proof and paired Odoo comparison remain
  open; repository and static checks are being rerun against the rebased tree.

## Rebased candidate evidence

- Final candidate commit: `HEAD`, rebased onto active `a7088525`.
- The active `Edit details` action remains first in the transfer form and its
  existing test contract is preserved; Draft Delete follows it.
- `bun test test/inventory_transfer_crud.integration.test.ts`: PASS, 3 tests /
  13 assertions. `bun test test/inventory_transfer_workflow.integration.test.ts`:
  PASS, 3 tests / 43 assertions.
- `bun run audit`: PASS, 659 pages / 668 routes / 1136 datasources.
  `bun run css:build:inventory`, scoped ESLint, and `git diff --check`: PASS.
- Authenticated New/Delete browser proof and paired Odoo comparison remain
  open; no module sign-off is implied.

## QA execution — candidate `a238bd3d` (2026-09-13)

- Focused CRUD regression: `bun test test/inventory_transfer_crud.integration.test.ts --timeout 20000` — PASS, 3 tests / 13 assertions. It proves the required `name`/`scheduled_date` contract, deterministic Draft creation, duplicate 409, stale/non-Draft delete 409, move-history deletion, and repository persistence.
- Focused workflow regression: `bun test test/inventory_transfer_workflow.integration.test.ts --timeout 20000` — PASS, 3 tests / 43 assertions. The first header action remains `Edit details`; Delete follows it, and the existing transfer workflow contract remains green.
- Static/build checks: `bun run audit` PASS (659 pages / 668 routes / 1136 datasources); `bun run css:build:inventory` PASS; TypeScript test ESLint PASS; `bun run frontend:build` PASS; `git diff --check` PASS.
- Authenticated Core3 desktop (`1440x900`, isolated `localhost:3032`, Admin): `/inventory/receipts` rendered 6 seeded receipts and the New Receipt form. Blank Save showed the required-field guard; a valid `WH/IN/QA-A238-2` receipt returned HTTP 200 with `id=receipt-wh-in-qa-a238-2`, `state=Draft`, `row_version=1`, and appeared in the list. A duplicate reference returned HTTP 409 and the visible `already exists` error. Capture: `/tmp/core3-odoo-parity/inventory-a238bd3d-desktop-receipts-final.png`.
- Authenticated Draft detail desktop: `WH/IN/00003` rendered `Edit details` first and `Delete` second; a non-Draft detail hid Delete. Capture: `/tmp/core3-odoo-parity/inventory-a238bd3d-desktop-draft-detail.png`.
- Draft Delete browser result: FAIL. Clicking the rendered Delete action sent `/api/mutate`, but the request resolved `expected_row_version` as an empty string. Backend error was `Conversion Error: Could not convert string '' to INT64` in the Draft guard, followed by frontend HTTP 502/socket hang-up and backend exit. This is a reproducible browser integration defect; no deletion success or persistence-after-reload is claimed. Repository-level deletion still passes with an explicit row version.
- Authenticated Core3 mobile (`390x844`): `/inventory/receipts` rendered with New available and no horizontal overflow; capture `/tmp/core3-odoo-parity/inventory-a238bd3d-mobile-receipts.png`. Fleet login (`fleet@tms.local`) reached the authenticated receipts route with no New control, confirming the visible write boundary; the timed attempt did not submit a mutation.
- Paired Odoo reference (`core3_reference`, authenticated `codex@core3.local`): `/odoo/receipts` rendered 6 receipts at desktop and responsive kanban at mobile with no horizontal overflow. Captures: `/tmp/core3-odoo-parity/inventory-a238bd3d-odoo-receipts-desktop.png` and `/tmp/core3-odoo-parity/inventory-a238bd3d-odoo-receipts-mobile.png`.

QA disposition: CONDITIONAL / BLOCKED on browser Draft Delete. Receipt create and contract-level guards pass; the candidate is not signed off.

## Repair evidence — Draft Delete row version

- Draft Delete now resolves params from the form record (`{row.id}` and
  `{row.row_version}`) instead of page state, so the mutation no longer sends
  an empty `expected_row_version`. Existing Edit details ordering and all
  Draft/state/concurrency guards remain unchanged.
- `inventory_transfer_crud.integration.test.ts` reproduces the browser
  interpolation path and asserts `receipt-00003` plus version `"1"`; it also
  retains persistence, dependent move cleanup, duplicate, stale, and
  non-Draft guard coverage.
- Full Inventory suite: `bun test test/inventory*.integration.test.ts
  --timeout 20000` — PASS, 42 tests / 454 assertions across 14 files.
- `bun run audit` — PASS, 659 pages / 668 routes / 1136 datasources.
  `bun run css:build:inventory`, scoped ESLint, and `git diff --check` — PASS.
- Authenticated browser deletion should be rerun by QA against this repair;
  this developer run proves the exact parameter-resolution path and repository
  mutation contract but does not claim a new browser capture.

## Merge review record — candidate `84dd0f48` / QA `85fa66c1`

- QA evidence was reviewed and retained: focused CRUD/workflow checks,
  audit, and diff check passed; authenticated New/Delete and paired Odoo
  comparison remained blocked.
- QA-only changes were merged into this ledger. The product candidate was not
  integrated because it conflicts with active transfer edit page/test code;
  no Inventory sign-off is implied.

## QA retest — repair commit `9c73da7f` (2026-09-13)

- Exact target: `HEAD=9c73da7feac10c5f40c849bffb1430e386b43dab` in
  `inventory-dev4-20260913`.
- Browser-shaped contract PASS: `receipt-00003` plus row version `1` resolves
  to `expected_row_version: "1"`; duplicate, stale, non-Draft, move cleanup,
  and persistence guards remain covered.
- Full Inventory regression PASS: 42 tests / 454 assertions across 14 files.
  Audit PASS (659 pages / 668 routes / 1136 datasources), Inventory CSS,
  frontend build, scoped ESLint, and `git diff --check` PASS.
- Authenticated Admin list smoke PASS on `http://localhost:4034`: desktop
  1440x900 and mobile 390x844 rendered 6 seeded receipts with no page errors
  or horizontal overflow. Captures: `/tmp/core3-odoo-parity/inventory-retest-9c73da7f/`.
- Authenticated Draft Delete: NOT RETESTED / BLOCKED. The first probe used
  `/inventory/receipts/detail` (wrong URL) and reached no form. The corrected
  declared route `/inventory/transfer/detail` then returned HTTP 503
  `Service host unavailable` after the isolated service host exited; no
  `/api/mutate` request was emitted. No live deletion or reload-persistence
  result is claimed, and the prior 502 is not re-signed as fixed.
- Permissions/stale guards PASS only at integration boundary for this retest;
  no browser mutation boundary was reached. Existing paired Odoo receipts
  captures remain historical reference only; no fresh exact-commit pair was
  made after the bounded runtime failure.

QA disposition: RETEST INCOMPLETE / BLOCKED on authenticated Draft Delete. No
Inventory sign-off or aggregate progress claim.

## 503 root-cause investigation

- Exact API path: `GET /inventory/transfer/detail?id=receipt-00003`; the
  rendered Delete action posts to `/api/mutate` with
  `inventory.pickings.delete`.
- Clean Inventory runner: PID `3519107` (`agent-module` parent `3519103`)
  listened on `*:4143`; `/api/modules`, detail, login, and authenticated
  Delete returned HTTP 200 with row version `1`.
- Controlled gateway reproduction: PID `3524523` listened on `*:4144` while
  configured for service host `127.0.0.1:4199`; `ss` showed no `4199` listener.
  The exact detail request returned HTTP 503 with
  `Service host unavailable` / `TARGET_UNAVAILABLE`, matching QA. This occurs
  before the Inventory mutation route and is runner infrastructure, not an
  Inventory guard or persistence failure.
- Added a client transport regression asserting `/api/mutate` receives the
  resolved `receipt-00003` and `expected_row_version: "1"` payload.
- Full Inventory suite: 43 tests / 455 assertions across 14 files. Audit:
  659 pages / 668 routes / 1136 datasources. Inventory CSS, scoped ESLint,
  and `git diff --check` all pass.

QA should rerun authenticated Draft Delete with a live gateway target and
retain listener/process evidence; no browser deletion claim is made here.

## QA retest — exact candidate `31441d3f` (2026-09-13)

- Requested path `/home/nhanjs/projects/core3-worktrees/agent/odoo-ui-inventory-dev4-20260913` was absent. Exact commit `31441d3f1a916a7aa5c0601dd2fe2473f34208fc` was retested at `/home/nhanjs/projects/core3-worktrees/inventory-dev4-20260913`.
- Full Inventory suite: `bun test ./test/inventory*.integration.test.ts --timeout 20000` — PASS, 43 tests / 455 assertions across 14 files. Audit — PASS, 659 pages / 668 routes / 1136 datasources. Inventory CSS, scoped ESLint, and `git diff --check` — PASS.
- Healthy runtime: `bun run agent:module -- inventory --port=4314`, file watching disabled. Agent PID `3578442` (parent `3578426`) and server PID `3578446` listened on `*:4314`; `/api/modules` returned 200. The dead gateway was not used.
- Authenticated Playwright via `/usr/bin/google-chrome`, Admin `admin@tms.local`, desktop 1440x900: Draft `WH/IN/00003` showed Delete. Clicking sent one POST to `/api/mutate` with `inventory.pickings.delete`, `id=receipt-00003`, and `expected_row_version="1"`; no page/request errors occurred. Capture: `/tmp/inventory-31441-draft-before-delete.png`.
- Persistence PASS: reload returned `1-5 / 5` and `WH/IN/00003` was absent; capture: `/tmp/inventory-31441-after-delete.png`.
- Live guards PASS: Admin stale delete (`receipt-00003`, version 99) returned HTTP 409 `INVENTORY_TRANSFER_DELETE_NOT_ALLOWED`; Admin non-Draft delete (`receipt-00001`, version 1) returned the same 409; Fleet delete returned HTTP 403 `inventory.write`. Fleet lacked Inventory read permission, so Delete was hidden and no unauthorized mutation was allowed.
- Paired Odoo: `http://127.0.0.1:8069/web/login` answered HTTP 200 with title `Odoo`. Existing authenticated `core3_reference` receipt desktop/mobile captures remain available at `/tmp/core3-odoo-parity/inventory-a238bd3d-odoo-receipts-{desktop,mobile}.png`; no fresh authenticated exact-commit pair is claimed.

QA disposition: browser Draft Delete, persistence, guards, permissions, full focused suite, audit, CSS, ESLint, and diff hygiene PASS. No module sign-off or aggregate progress claim.

## Transfer operation QA — exact candidate `d73bed5b` (2026-09-13)

- Focused workflow: **PASS**, 4 tests / 50 assertions; Ready `receipt-00001`
  moved to Waiting, row version 1 → 2, and the Unreserved timeline event
  persisted. Stale-row and non-Ready guards returned the declared 409.
- Full Inventory regression: **PASS**, 44 tests / 462 assertions across 14
  files. Audit passed at 659 pages / 668 routes / 1,136 datasources; Inventory
  CSS, frontend build, scoped ESLint, and `git diff --check` passed.
- Authenticated Admin browser on `http://127.0.0.1:4386`: desktop 1440x900
  showed Unreserve, emitted `inventory.pickings.unreserve` with
  `receipt-00001` and version `1`, and returned HTTP 200 Ready → Waiting;
  reload preserved Waiting and hid Unreserve. Mobile 390x844 had no overflow.
  Captures: `/tmp/inventory-d73-ready-before.png`,
  `/tmp/inventory-d73-waiting-after.png`, `/tmp/inventory-d73-waiting-reload.png`,
  `/tmp/inventory-d73-mobile-receipts.png`.
- Fresh authenticated Odoo pairing and Fleet browser authentication were not
  available in this bounded run; contract permission coverage passed. The
  broader Inventory module remains open.

QA disposition: **PASS for review handoff of candidate `d73bed5b` Unreserve**;
no Inventory module sign-off or aggregate progress claim.

## Transfer operation QA — Unreserve (2026-09-13)

- Contract and repository workflow test: PASS. Ready `receipt-00001` moved to
  Waiting with `row_version` 1 → 2 and a persisted Unreserved timeline event.
- Stale row and non-Ready state guards: PASS with
  `INVENTORY_TRANSFER_UNRESERVE_NOT_ALLOWED` (409).
- Authenticated browser capture: OPEN; this bounded change has no visual or
  live mutation claim until QA exercises the form action through the healthy
  Inventory runner.
## 2026-09-13 coordinator dispatch — bounded transfer attachment wave

- Existing owner `agent/odoo-ui-inventory-dev4-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/inventory-dev4-20260913`, based at
  `d73bed5b`. Development event: `DEV-INVENTORY-WAVE-20260913-R2`; QA event:
  `QA-INVENTORY-WAVE-20260913-R2`; handoff commit: `8248d078`.
- Scope is permissioned transfer-document attachment upload/list/download (or
  exposed subset), ownership/company checks, safe missing/invalid handling,
  persistence, and focused stale/no-partial-write tests. Candidate pending;
  existing ledger edits and aggregate progress are preserved.

## QA disposition `f666cec5`: blocked; same-owner repair required (2026-09-13)

- Do **not** integrate `f666cec5`. Contract/file-backed coverage passed **47
  tests / 490 assertions**, with build, audit, lint, and diff-check green.
- Critical defect `INV-ATTACH-001`: authenticated admin context is `Core3 Demo
  Company`, while seeded transfer `WH/IN/00003` uses `My Company`. Live transfer
  attachment upload returns **403** `INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED`;
  no live attachment is created, so browser upload/list/download persistence
  cannot pass.
- Repair is routed to the existing owner/worktree
  `agent/odoo-ui-inventory-dev4-20260913` at
  `/home/nhanjs/projects/core3-worktrees/inventory-dev4-20260913`: align the
  deterministic transfer fixture with authenticated company context or use a
  valid company-scoped seed, then rerun live upload/download and focused QA.
- Preserve open mobile upload completion, live restart durability, and fresh
  authenticated Odoo comparison gates. Candidate remains blocked; no duplicate
  owner or product merge was created.

## Reviewer reconciliation `b5bd4325`: conditionally integrated (2026-09-13)

- Ordered Inventory attachment commits are active: `1540e5f9` (attachment
  surface), `724f78ec` (company fixture), and `f8651357` (detail datasource
  company context). Requested `b5bd4325` was already represented by
  `f8651357`; its cherry-pick was empty, so no duplicate was created.
- Active verification passed **48 tests / 497 assertions** across 15 files,
  including upload/prefetch/query/list/download, company isolation, guards, and
  file-backed persistence. Audit passed **661 pages / 670 routes / 1159
  datasources**; Inventory CSS and diff-check passed.
- QA records Demo -> Vietnam zero-row isolation, desktop/mobile/reload,
  restart auth boundary, and clean builds/lint/diff checks. The datasource
  defect is resolved for this bounded slice.
- Conditional status remains because authenticated Odoo comparison and
  unrelated Website full-lint errors remain open.

## Package Transfers QA — bounded contract (2026-09-20)

- Source mapping: Odoo `stock.package.action_view_picking` resolves all
  pickings whose move lines reference the package as source or result.
- Core3 contract: `/packages/transfers` with `inventory.tracking`, a package
  context/stat, source/result relation labels, and row navigation to shared
  transfer detail.
- Focused test: `test/inventory_package_transfers.integration.test.ts` — 3
  tests / 22 assertions passed, including idempotent migration, deterministic
  filters, empty/503 states, permission denial, missing-package isolation, and
  file-backed restart persistence.
- Browser and paired Odoo visual evidence remain open for this slice; no visual
  sign-off is claimed.

## Put in Pack QA — `INV-PACK-001` (2026-09-20)

- Source comparison: `stock.picking.action_put_in_pack`, its
  `stock.move.line._put_in_pack` delegation, the Operations form button, and
  `stock.action_put_in_pack_wizard` were inspected in the Odoo stock addon.
  Odoo's reference button is group-gated by `stock.group_tracking_lot`.
- Core3 implementation: page/API YAML separation on `transfer-detail`,
  `stock.picking.put_in_pack`, migration `0.0.21`, deterministic
  `delivery-00002` move fixture, package contents/result relation, timeline,
  permission, state, duplicate, and row-version guards.
- Focused test: `bun test test/inventory_put_in_pack.integration.test.ts` —
  PASS, 3 tests / 18 assertions. The stale expected-row-version boundary,
  read-only 403, duplicate/pre-packed 409, blank reference 422, and
  close/reopen persistence are covered.
- Authenticated Core3 browser: Admin at `http://127.0.0.1:4521`, desktop
  1440x900 and mobile 390x844. The desktop dialog submitted
  `PACK-BROWSER-20260920`, the timeline displayed `Put in Pack`, the Packages
  list showed the persisted package, and reload retained the timeline/package.
  No failed requests or horizontal overflow were recorded.
- Authenticated Odoo browser: `codex@core3.local` at `http://127.0.0.1:8069`,
  desktop/mobile 1440x900 and 390x844. `WH/OUT/00002` rendered as Ready with
  its move line, but `Put in Pack` was absent because the authenticated user
  lacks the source view's `stock.group_tracking_lot`; no Odoo write was made.
  This is evidence of the source permission boundary, not a parity sign-off.
- Evidence: `plan/odoo-ui-parity/evidence/inventory/2026-09-20/INV-PACK-001/`
  contains Core3 before/dialog/after/reload/package/mobile captures plus JSON,
  and paired Odoo desktop/mobile captures plus `odoo.json`.

QA disposition: PASS for the bounded Core3 lifecycle and evidence handoff;
Odoo action execution remains open behind the reference user's group gate.
The Inventory module remains open and this slice does not sign off the module.

## Package Transfers QA — `INV-PACK-TRANSFER-001` (2026-09-20)

- Odoo source: `stock_package_view_form` renders the `Package Transfers` stat
  button for `stock.package.action_view_picking`; the Python action filters
  pickings through move-line `package_id` or `result_package_id`. The source
  menu/action and stat are restricted by `stock.group_tracking_lot`.
- Core3 contract revalidated: `pages/package-detail.yaml` and
  `pages/package-transfers.yaml` are presentation-only, joined by matching
  API `page.id` fragments. The package-scoped list preserves source/result
  relation labels and opens the shared transfer detail.
- Focused test: `bun test test/inventory_package_transfers.integration.test.ts`
  — PASS, 3 tests / 22 assertions, covering deterministic source/result
  relations, empty/transport/not-found paths, tracking permission denial,
  package scope, idempotent migration, and file-backed restart persistence.
- Authenticated Core3: Admin on `http://127.0.0.1:4531`, desktop 1440x900 and
  mobile 390x844. Package `PACK0000001` opened with transfer count 2; the stat
  opened `/inventory/packages/transfers`, showing `WH/OUT/00001` as `source`
  and `WH/IN/00001` as `result`, with row navigation to transfer detail. Both
  viewports had no failed requests or horizontal overflow.
- Authenticated Odoo: `codex@core3.local` on `http://127.0.0.1:8069`, desktop
  and mobile. `/odoo/packages` redirected to Discuss and the Packages menu was
  unavailable; `odoo.json` records the exact `stock.group_tracking_lot` gate
  and both screenshots. This is an exact blocker, not an Odoo parity claim.
- Evidence: `plan/odoo-ui-parity/evidence/inventory/2026-09-20/INV-PACK-TRANSFER-001/`.

QA disposition: PASS for the Core3 Package Transfers lifecycle and paired
evidence gate; Odoo action execution remains blocked by the authenticated
reference user's source permission. Inventory module sign-off remains open.

## Annual Inventory settings QA — `INV-SETTINGS-001` (2026-09-20)

- Odoo source comparison covered `stock.action_stock_config_settings`,
  `stock.menu_stock_general_settings`, `base.group_system`,
  `stock.group_stock_manager`, and the `res.company` annual day/month related
  fields. The source defaults are day 31 and month `'12'`.
- Core3 keeps the page and API YAML separate, joined by
  `page.id: inventory-settings`. Migration `0.0.22` adds durable annual fields
  and deterministic null backfills; the manager-only Save mutation uses the
  existing row-version contract.
- Focused test: `bun test test/inventory_settings.integration.test.ts
  --timeout 20000` — 4 passed, 21 assertions. Coverage includes CRUD/save,
  stale and missing guards, read-only 403 page/mutation boundaries, idempotent
  migration, and file-backed restart persistence.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-20/INV-SETTINGS-001/`: desktop 1440x900 and
  mobile 390x844 Save/reload captures have empty failed-request lists and no
  horizontal overflow. Browser persistence was 20/3 on desktop and 21/4 on
  mobile.
- Odoo paired capture was attempted with the authenticated reference user at
  both viewports. The supplied `/odoo/action-445` action fails before rendering
  the Settings form with `RPC_ERROR`; technical details identify
  `ir.actions.server(445)` evaluating `record.action_convert_to_subtask()` on a
  `None` record. Screenshots and the full response are retained as exact blocker
  evidence, so this remains partial rather than a false sign-off.

QA disposition: PASS for the bounded Core3 annual-settings lifecycle and
permission/restart contract; PARTIAL for Odoo visual parity because the supplied
reference action is server-blocked. Full Inventory sign-off remains open.

## Stock report Inventory at Date QA — `INV-STOCK-AT-DATE-001` (2026-09-20)

- Odoo source/menu/action comparison: `stock.menu_product_stock` →
  `stock.action_product_stock_view`; the header wizard is
  `stock.action_inventory_at_date` on `stock.quantity.history` and passes
  `to_date` when reopening the stock list.
- Core3 implementation: `pages/stock-report.yaml` remains layout-only; API
  `stock-report.yaml` owns the context datasource and date server form. Migration
  `0.0.23` seeds a deterministic 2026-01-15 run and persists later date choices
  in `inventory_stock_report_runs`.
- Focused test: `bun test test/inventory_stock_report.integration.test.ts
  --timeout 20000` — 4 passed, 50 assertions. It covers filtering, invalid
  dates, company and unauthorized boundaries, idempotence, and restart.
- Core3 evidence: `evidence/inventory/2026-09-20/INV-STOCK-AT-DATE-001/`.
  Authenticated desktop/mobile Save/reload retained 2026-01-16 and 10 rows;
  API responses were 200, failed requests empty, and widths were 1440/1440 and
  390/390.
- Odoo evidence: authenticated Stock report rendered at both viewports with no
  failed requests. Desktop opened the date wizard. At 390px the responsive
  action surface did not expose the date control; `odoo.json` and the mobile
  capture preserve that exact boundary. No Odoo write was made.

QA disposition: PASS for the bounded Core3 date-context lifecycle and
permission/restart contract; PARTIAL for responsive Odoo wizard comparison.
Full Inventory sign-off remains open.

## Operations Types QA — `INV-OP-TYPES-001` (2026-09-20)

- Odoo source/menu/action: `stock.menu_pickingtype` →
  `stock.action_picking_type_list` in `stock_picking_type_views.xml`, with
  `list,form` modes and the Operation Types search/form fields recorded in the
  feature evidence.
- Core3 repaired the missing `ListView.create_action`, added operation kind and
  source/destination fields to the server form, joined detail location labels
  to durable operation-type locations, and added migration `0.0.24` for
  row-version backfill/default durability. Page/API YAML remains separate.
- Focused test: `bun test test/inventory_operation_types.integration.test.ts
  --timeout 20000` — PASS, 3 tests / 41 assertions. Coverage includes
  deterministic active/archived fixtures, runtime page/action 403 checks,
  create/edit/archive/restore, duplicate/invalid/required/open-transfer/stale
  guards, idempotent migration, and file-backed restart.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-20/INV-OP-TYPES-001/`: desktop 1440x900 and
  mobile 390x844 list/detail, create modal, edit, and reload captures. The
  evidence JSON records an empty browser failure list; the detail reload keeps
  the edited code and Stock/Transit location labels.
- Authenticated Odoo evidence uses `codex@core3.local` at
  `http://127.0.0.1:8069/odoo/action-426`. Login succeeds, but the action
  renders Odoo's generic `Oops!` error at desktop and mobile before the list or
  form loads. `odoo.json` and both screenshots retain this exact blocker; no
  Odoo mutation or visual parity sign-off is claimed.

QA disposition: PASS for the bounded Core3 lifecycle and permission/restart
contract; PARTIAL for Odoo comparison because the supplied source action is
runtime-blocked. Full Inventory sign-off remains open.
