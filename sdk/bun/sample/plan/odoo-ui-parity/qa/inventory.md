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

## INV-PRODUCT-CATEGORIES-001 QA (2026-09-21)

| Check | Result | Evidence |
| --- | --- | --- |
| Odoo source/menu/action/model comparison | PASS | `evidence/inventory/2026-09-21/INV-PRODUCT-CATEGORIES-001/source-comparison.md` |
| Page/API separation and direct schema validation | PASS | `inventory_product_categories.integration.test.ts`; matching `page.id` contracts |
| Durable hierarchy and descendant product counts | PASS | focused integration test and migration `0.0.50` |
| Manager CRUD, duplicate/parent/cycle/in-use guards, row version | PASS | focused integration test |
| Reader list/detail vs manager mutation permission boundary | PASS | focused integration test |
| Product stat to filtered Product Variants drilldown | PASS | focused integration test and `api/product-variants.yaml` category filter |
| File-backed restart persistence | PASS | focused integration test |
| Authenticated Core3 desktop/mobile list/detail | PASS | `evidence/inventory/2026-09-21/INV-PRODUCT-CATEGORIES-001/core3-{desktop,mobile}.*` |
| Paired authenticated Odoo desktop/mobile | BLOCKED | Odoo probe returned HTTP 303 to `/web/login`; see `odoo-blocker.json` |
| Repository-wide audit | BLOCKED / pre-existing | Employees `employee-detail.yaml`: `actions[11].result is not allowed`; not modified |

This is a bounded feature result, not full Inventory sign-off.

## INV-PACKAGE-TYPES-001 QA (2026-09-21)

| Check | Result | Evidence |
| --- | --- | --- |
| Odoo source/menu/action/model comparison | PASS | `evidence/inventory/2026-09-21/INV-PACKAGE-TYPES-001/source-comparison.md` |
| Page/API separation and discovery | PASS | `inventory_package_types.integration.test.ts`; matching `page.id` contracts |
| Durable deterministic fixtures and company scope | PASS | focused integration test and migration `0.0.49` |
| Manager CRUD, barcode/dimension guards, in-use delete, row version | PASS | focused integration test |
| Reader list/detail vs manager mutation permission boundary | PASS | focused integration test |
| File-backed restart persistence | PASS | focused integration test |
| Authenticated Core3 desktop/mobile list/detail | PASS | `evidence/inventory/2026-09-21/INV-PACKAGE-TYPES-001/core3-{desktop,mobile}.*` |
| Paired authenticated Odoo desktop/mobile | BLOCKED | Odoo probe returned HTTP 303 to `/web/login`; see `odoo-blocker.json` |

This is a bounded feature result, not full Inventory sign-off.

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

## Inventory Product Variants QA — `INV-PRODUCT-VARIANTS-001` (2026-09-21)

- Odoo source/menu/action: PASS from
  `addons/stock/views/product_views.xml:90-117,652-664` and
  `addons/product/views/product_views.xml:421-455`. Product Variants is the
  `product.product` `list,form,kanban` action under Inventory Products,
  restricted by `product.group_product_variant`; stock adds On Hand and
  Forecasted list fields.
- Core3 contract: PASS. List/detail presentation YAML is separate from list/
  detail API YAML and joined by `page.id`. Migration 0.0.47 adds durable
  variant and stock context with deterministic active, archived, and shared
  fixtures. Read and manager mutation permissions, current-company scope,
  duplicate reference/barcode, stock delete guard, and row versions are
  contract-tested.
- Focused test: `bun test test/inventory_product_variants.integration.test.ts
  --timeout 20000` — PASS, 4 tests / 29 assertions. `bun run audit` — PASS,
  708 pages, 717 routes, 1,349 datasources. Scoped ESLint and diff-check pass.
- Core3 browser evidence: PASS for authenticated desktop 1440x900 and mobile
  390x844 list/detail states; mobile also renders the New Product Variant
  form. Widths equal their viewports, with no console errors or bad HTTP
  responses. The unrelated aborted notifications poll is recorded in paired
  JSON evidence.
- Odoo comparison: BLOCKED for the requested Product Variants state. The
  supplied account authenticated but `/odoo/action-434` redirected to
  `/odoo/discuss` at both viewports. No Product Variants state or mutation is
  claimed; exact screenshots and result JSON are under
  `evidence/inventory/2026-09-21/INV-PRODUCT-VARIANTS-001/`.

QA disposition: PASS for the bounded Core3 Product Variants lifecycle and
guards; BLOCKED for the paired Odoo action capture. Full Inventory sign-off
remains open.

## Inventory Units & Packagings QA — `INV-UNITS-PACKAGINGS-001` (2026-09-21)

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_menu_views.xml:20-34`,
  `addons/uom/views/uom_uom_views.xml:3-61`, and
  `addons/uom/models/uom_uom.py:17-47,97-104`. The action is
  `uom.product_uom_form_action` for `uom.uom`, with list/form sequence, name,
  quantity, reference-unit, search, and UoM-group behavior.
- Core3 contract: PASS. List/detail presentation YAML is separate from list/
  detail API YAML and joined by `page.id`. Migration 0.0.48 adds durable
  conversion/reference rows, usage counts, company scope, active/archive
  state, and deterministic fixtures. Manager mutations enforce factor,
  reference, company, duplicate, in-use/dependent, and row-version guards.
- Focused test: `bun test test/inventory_units_packagings.integration.test.ts
  --timeout 20000` — PASS, 4 tests / 35 assertions. `bun run audit` — PASS,
  710 pages, 719 routes, 1,353 datasources. Scoped ESLint and diff-check pass.
- Core3 browser evidence: PASS for authenticated desktop 1440x900 and mobile
  390x844 list/detail states with matching document/body widths and no feature
  HTTP or console errors. The unrelated notifications poll abort is recorded
  in paired JSON evidence; browser New-form rendering is not claimed.
- Odoo comparison: PASS. Authenticated `/odoo/action-90` renders the actual
  Units & Packagings list with 21 rows at both viewports; no Odoo mutation was
  attempted. Evidence is under
  `evidence/inventory/2026-09-21/INV-UNITS-PACKAGINGS-001/`.

QA disposition: PASS for the bounded Core3 contract, lifecycle tests, and
paired read-only Odoo list evidence; Core3 browser CRUD-form rendering remains
open. Full Inventory sign-off remains open.

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

## Scrap Orders validation QA — `INV-SCRAP-001` (2026-09-20)

- Odoo source/menu/action: `stock.menu_stock_scrap` →
  `stock.action_stock_scrap`; the form's `action_validate` creates and
  completes a stock move/move line, sets Done/date_done, and exposes Product
  Moves. Source references and exact fields are recorded in the feature
  evidence.
- Core3 implementation: migration `0.0.25` persists `inventory_scrap_moves`
  and deterministic Done fixture relations. The separate Scrap API owns the
  detail/move datasources and validation mutation; the page owns the form and
  read-only Product Moves `LineItemGrid`.
- Focused test: all 4 Scrap Orders tests pass (36 assertions), covering
  page/API ownership, fixture/filter/error, CRUD/validation/relation/restart,
  and runtime permission boundary. An earlier invocation saw a transient
  unrelated shared-checkout discovery error; the subsequent full Inventory
  suite and UI audit passed after that boundary was repaired by its owners.
- Authenticated Core3 evidence: desktop/mobile list and detail captures show
  Draft → Done, revision 1 → 2, and the persisted Product Move. Authenticated
  Odoo evidence renders `/odoo/scraps` at desktop and mobile with the source
  list and kanban surfaces. No Odoo mutation was made.

QA disposition: PASS for the bounded Core3 Scrap lifecycle, persistence,
permission, evidence contract, and final scoped verification. Full Inventory
sign-off remains open for the residual source behaviors and full actor matrix.

## Physical Inventory Apply All QA — `INV-PHYSICAL-001` (2026-09-20)

- Odoo source/menu/action: `stock.menu_action_inventory_tree` invokes
  `stock.action_view_inventory_tree`; the editable quant list's Apply All
  opens `stock.inventory.adjustment.name` with Inventory Reason and Counting
  Date, then applies only counted quants and creates inventory history.
- Core3 implementation: `pages/physical-inventory.yaml` is layout-only; the
  matching API YAML owns datasources and actions. Migration `0.0.26` adds
  durable `inventory_adjustments`; Apply All records the run, updates counted
  quants only, and writes deterministic non-zero move-history rows.
- Focused test: 4 tests / 39 assertions pass, covering page/API ownership,
  deterministic fixtures, CRUD/workflow guards, counted-only adjustment,
  move side effects, runtime permission denial, and file-backed restart.
  Full Inventory regression passes 61 tests / 627 assertions.
- Authenticated evidence: Core3 desktop list/modal/after-apply and direct
  mobile route captures are paired with Odoo desktop/mobile Physical Inventory
  captures. Browser errors and mobile overflow are absent in the final Core3
  capture; no Odoo mutation was made.

QA disposition: PASS for the bounded Physical Inventory Apply All lifecycle,
durability, permissions, evidence contract, and final scoped verification.
Full Inventory sign-off remains open for the broader actor matrix and residual
conflict/reset/relocation/report semantics.

## Moves Analysis QA — `INV-MOVES-ANALYSIS-001` (2026-09-20)

- Odoo source/menu/action: `stock.stock_move_menu` → `stock_move_action`,
  model `stock.move`, source `stock_move_views.xml:4-25,27-63,320-407,437`.
  The action is read-only with default Done context and list/pivot/graph/
  kanban/form states.
- Core3 implementation: Reporting > Moves Analysis is manifest-owned;
  `pages/moves-analysis.yaml` is presentation-only and binds to
  `api/moves-analysis.yaml`. Migration `0.0.27` persists the deterministic
  stock-move projection. The detail route has its own page/API fragment and
  no edit or CRUD actions.
- Focused test: 4 tests / 41 assertions pass, covering source/menu contract,
  page/API separation, deterministic state/type/date/search filters, pivot
  aggregation, empty/404/503 behavior, read-only permission boundaries, and
  file-backed restart.
- Authenticated evidence: Core3 desktop list/pivot/detail and mobile list;
  Odoo desktop pivot/list and mobile kanban. All final browser captures have
  empty failed-request/page-error lists and viewport/body widths of 1440/1440
  and 390/390. Odoo was inspected only; no mutation was performed.

QA disposition: PASS for the bounded Moves Analysis report lifecycle,
read-only contract, persistence, permissions, and evidence. Full shared-runner
verification is PARTIAL because an unrelated committed Surveys YAML boundary
prevents global discovery; no other module files were changed.

## On Hand quant relocation QA — `INV-PHYSICAL-RELOCATE-001` (2026-09-20)

- Odoo source/menu/action: `stock.action_view_quants` (`stock_quant_views.xml:213-223`)
  opens the quant Locations/On Hand list. Manager-only `Relocate` is the
  `action_stock_quant_relocate` object action (`stock_quant_views.xml:108-117`),
  backed by `stock.quant.relocate` (`wizard/stock_quant_relocate.py:9-99`).
  Positive quantity, active-internal destination, and `Quantity Relocated` move
  semantics are recorded in the evidence source note.
- Core3 implementation: `pages/stock.yaml` contains only the On Hand layout;
  `api/stock.yaml` owns `inventory_stock`, active-internal location options,
  relocation history, and the `inventory.manage` server form. Migration `0.0.28`
  persists deterministic relocation audits. The mutation is optimistic and
  atomic across quant location, relocation audit, and move history.
- Focused test: `bun test test/inventory_quant_relocation.integration.test.ts`
  — PASS, 4 tests / 21 assertions. Coverage includes source contract,
  deterministic positive-quantity relocation, lot/move-history preservation,
  invalid/same/conflicting/stale guards, manager permission denial, and
  file-backed restart.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-20/INV-PHYSICAL-RELOCATE-001/`: desktop On Hand,
  desktop Relocate modal, completed relocation, and mobile On Hand. The final
  run had no page failures and no horizontal overflow.
- Authenticated Odoo evidence is in the same directory. XML IDs resolve to
  `stock.action_view_quants` res_id 506 and `stock.menu_action_inventory_tree`
  res_id 314; `/odoo/action-506` redirects to `/odoo/stock-locations` and
  renders the source Locations/On Hand list at 1440x900 and 390x844 with no
  failed requests or overflow. No Odoo mutation was made.

QA disposition: PASS for the bounded relocation lifecycle, durable data,
permissions, and authenticated desktop/mobile evidence. Full Inventory sign-off
remains open for the broader actor/company matrix and report/export semantics.

## Physical Inventory Request a Count QA — `INV-PHYSICAL-REQUEST-COUNT-001` (2026-09-20)

- Odoo source/menu/action: `stock.menu_action_inventory_tree` invokes
  `stock.action_view_inventory_tree`; its manager-only Request a Count action
  invokes `stock.action_stock_request_count` and the
  `stock.request.count` wizard. Source fields are Scheduled at, Assign to,
  and Show expected quantity. Confirm writes the selected quants' inventory
  date and optional user without applying quantities.
- Core3 implementation: `pages/physical-inventory.yaml` remains layout-only;
  the matching API owns selectable bulk-action metadata, the manager form,
  assignee catalog, request history, and transactional mutation. Migration
  `0.0.29` persists request headers and selected-quant lines.
- Focused test: `bun test test/inventory_request_count.integration.test.ts`
  — PASS, 4 tests / 21 assertions. Coverage includes page/API separation,
  source action fields, selected-quant CRUD/workflow, invalid-selection
  rollback, permission denial, and restart persistence.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-20/INV-PHYSICAL-REQUEST-COUNT-001/`: desktop
  selected-row state, Request a Count modal, successful scheduled result, and
  mobile route. Final Core3 browser failures were empty and widths were
  1440/1440 and 390/390.
- Authenticated Odoo evidence is in the same directory. XML IDs resolve to
  `stock.action_view_inventory_tree` res_id 505,
  `stock.action_stock_request_count` res_id 492, and
  `stock.menu_action_inventory_tree` res_id 314. Odoo renders
  `/odoo/physical-inventory` at both viewports with no failed requests or
  overflow, but the supplied authenticated user does not expose the
  manager-only Request a Count control. No Odoo mutation was made.

QA disposition: PASS for the bounded Core3 request-count lifecycle, durable
data, permission boundary, and browser evidence; PARTIAL for direct Odoo
wizard comparison because of the exact source group gate. Full Inventory
sign-off remains open.

## Physical Inventory Clear/reset QA — `INV-PHYSICAL-RESET-001` (2026-09-20)

- Odoo source/menu/action: `stock.menu_action_inventory_tree` →
  `stock.action_view_inventory_tree`; manager-only `Clear` invokes
  `stock.quant.action_reset`, then `stock.inventory.warning.action_reset` and
  `stock.quant.action_clear_inventory_quantity`. The source clears inventory
  quantity/difference, unsets the count flag, and clears the user.
- Core3 implementation: `pages/physical-inventory.yaml` is layout-only; the
  matching API owns the manager bulk action, confirmation, reset datasource,
  company guard, selected-quant mutation, and audit lines. Migration `0.0.30`
  adds durable reset headers/lines and deterministic fixtures.
- Focused test: `bun test test/inventory_physical_reset.integration.test.ts`
  — PASS, 4 tests / 20 assertions. Coverage includes source contract,
  selected reset CRUD/workflow, company/stale/invalid guards, manager
  permission, and file-backed restart persistence.
- Authenticated evidence is under
  `evidence/inventory/2026-09-20/INV-PHYSICAL-RESET-001/`: Core3 desktop
  list/selection/Clear control and mobile list, plus Odoo desktop/mobile
  source-list captures. Core3 final list captures report 1440/1440 and
  390/390 with no page failures; Odoo renders both source lists without
  horizontal overflow. The exact blocker is that `codex@core3.local` lacks
  `stock.group_stock_manager`, so Odoo Clear/warning cannot be opened.

QA disposition: PASS for the bounded Core3 reset lifecycle, durable data,
permissions, and evidence contract; PARTIAL for direct Odoo wizard comparison
because of the exact manager-group blocker. Full Inventory sign-off remains
open.

## Lot Traceability QA — `INV-LOT-TRACEABILITY-001` (2026-09-20)

- Odoo source/menu/action: lot form Traceability invokes
  `stock.action_stock_report` (`stock_traceability_report_data.xml:4-8`) and
  the authenticated `/stock/<output_format>/<report_name>` controller. The
  report renders Reference, Product, Date, Lot/Serial #, From, To, and
  Quantity.
- Core3 implementation: lot detail adds a permissioned Traceability route;
  `pages/lot-traceability.yaml` is presentation-only and binds to
  `api/lot-traceability.yaml`. The API owns company-scoped lines/history,
  fixed Print action, and durable report-run mutation. Migration `0.0.31`
  adds deterministic fixture data.
- Focused test: `bun test test/inventory_lot_traceability.integration.test.ts`
  — PASS, 4 tests / 20 assertions. Coverage includes page/API/source
  contract, report lines/run, actor/company/stale/empty guards, permission,
  and file-backed restart.
- Authenticated Core3 evidence is under
  `evidence/inventory/2026-09-20/INV-LOT-TRACEABILITY-001/`; desktop/mobile
  widths are 1440/1440 and 390/390 with empty final request/page-error arrays.
  Paired Odoo `/odoo/lots` desktop/mobile evidence is also present. The
  supplied user could not reach a selected lot form, so the Odoo Traceability
  stat/PDF comparison is blocked; mobile recorded the exact web asset failures
  in `odoo.json`. No Odoo mutation was performed.

QA disposition: PASS for the bounded Core3 traceability lifecycle, durable
report run, permissions, and evidence contract; PARTIAL for direct Odoo
Traceability comparison because of the exact navigation/asset blocker. Full
Inventory sign-off remains open.

## Transfer Check Availability reservations QA — `INV-TRANSFER-CHECK-AVAILABILITY-001` (2026-09-20)

- Odoo source/menu/action: `stock.picking.action_assign` from the transfer
  form's `Check Availability` button (`stock_picking_views.xml:117-120`),
  with reservation semantics in `stock_picking.py:1196-1210` and
  `stock_move.py:2041-2050`; paired `do_unreserve` releases reservations.
- Core3 implementation: `pages/transfer-detail.yaml` is layout-only;
  `api/transfer-detail.yaml` owns the reservation action, line fields,
  company/row-version guards, actor event, and reversible Unreserve mutation.
  Migration `0.0.32` persists reservation rows and deterministic fixture data.
- Focused verification: `bun test
  test/inventory_transfer_reservations.integration.test.ts
  test/inventory_transfer_workflow.integration.test.ts --timeout 20000` — PASS,
  8 tests / 73 assertions. Coverage includes reserve/unreserve state and
  quantity persistence, actor/company/stale/unavailable guards, permission
  denial, migration idempotence, and file-backed restart.
- Authenticated Core3 evidence is under
  `evidence/inventory/2026-09-20/INV-TRANSFER-CHECK-AVAILABILITY-001/`; desktop
  action and persisted mobile state report no request/page errors and no
  horizontal overflow. Paired authenticated Odoo desktop/mobile evidence is
  also present and reports no request/page errors or overflow.

QA disposition: PASS for the bounded Core3 reservation lifecycle and
permissions; PARTIAL for direct Odoo action execution because the reachable
reference transfer was already Ready/Available and hid Check Availability. No
Odoo mutation was made. Full Inventory sign-off remains open.

## Transfer Return lifecycle QA — `INV-TRANSFER-RETURN-001` (2026-09-20)

- Odoo source/menu/action: the completed transfer form's Return button in
  `stock_picking_views.xml:129-143` invokes `act_stock_return_picking` and the
  `stock.return.picking` wizard. Its source reverses locations, creates a
  `Return of <name>` picking, and confirms/assigns it.
- Core3 implementation: `pages/transfer-detail.yaml` is layout-only;
  `api/transfer-detail.yaml` owns the Done-only Return action, quantity/reason
  form, company/actor/current-row guards, return-history datasource, and
  timeline refresh. Migration `20260920300000-033-inventory-transfer-returns.yaml`
  persists the return ledger, reverse picking/move, and deterministic fixture.
  The bounded contract supports one completed source move line and explicitly
  leaves multi-line and exchange wizard behavior open.
- Focused test:
  `bun test test/inventory_transfer_returns.integration.test.ts test/inventory_transfer_workflow.integration.test.ts`
  — PASS, 8 tests / 73 assertions. Coverage includes page/API separation,
  durable reverse picking and move, actor/company/quantity/stale guards,
  `inventory.write` permission denial, timeline/detail refresh, and restart.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-20/INV-TRANSFER-RETURN-001/`: desktop Return
  form/submission, mobile persisted timeline, and JSON browser records.
- Authenticated Odoo evidence is in the same directory. Desktop 1440x1000 and
  mobile 390x844 `/odoo/deliveries/1` captures show Done/Available but no
  Return action; `/odoo/deliveries/1` through `/odoo/deliveries/10` were scanned
  with the same result. This is an exact blocker for direct wizard comparison;
  no Odoo mutation was made.

QA disposition: PASS for the bounded Core3 return lifecycle, durable data,
permissions, and responsive evidence; PARTIAL for direct Odoo wizard parity
because the supplied authenticated account exposes no Return action. Full
Inventory sign-off remains open.

## Transfer Backorder lifecycle QA — `INV-TRANSFER-BACKORDER-001` (2026-09-20)

- Odoo source/menu/action: partial `button_validate` processing invokes
  `stock.backorder.confirmation`; its wizard exposes per-transfer decision
  state with Create Backorder, No Backorder, and Discard. The source creates a
  linked backorder picking and moves only remaining quantities into it.
- Core3 implementation: `pages/transfer-detail.yaml` is layout-only;
  `api/transfer-detail.yaml` owns the partial-transfer Create Backorder form,
  Create/No decision, company/actor/current-row guards, history datasource,
  source move split, linked backorder picking/move, and timeline refresh.
  Migration `20260920310000-034-inventory-transfer-backorders.yaml` persists
  the relation, ledger, and deterministic partial fixture. The bounded
  contract supports one partial move line and leaves multi-transfer selection
  open.
- Focused test:
  `bun test test/inventory_transfer_backorders.integration.test.ts test/inventory_transfer_workflow.integration.test.ts`
  — PASS, 8 tests / 75 assertions. Coverage includes page/API separation,
  Create/No decisions, durable source/backorder rows, actor/company/decision/
  stale guards, `inventory.write` permission denial, timeline/detail refresh,
  no-partial-state behavior, and restart.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-20/INV-TRANSFER-BACKORDER-001/`: desktop
  partial transfer/form/submission, mobile persisted result, and JSON browser
  records.
- Authenticated Odoo evidence is in the same directory. Desktop and mobile
  delivery captures show no backorder wizard, while `/odoo/backorders`
  redirects to Discuss. This is an exact blocker for direct wizard comparison;
  no Odoo mutation was made.

QA disposition: PASS for the bounded Core3 backorder lifecycle, durable data,
permissions, and responsive evidence; PARTIAL for direct Odoo wizard parity
because the supplied authenticated account exposes no partial fixture or
wizard. Full Inventory sign-off remains open.

## Transfer Lock/Unlock lifecycle QA — `INV-TRANSFER-LOCK-001` (2026-09-21)

- Odoo source/menu/action: form-only `action_toggle_is_locked` in
  `stock_picking_views.xml:490-501`, manager-gated by
  `stock.group_stock_manager`; `stock.picking.action_toggle_is_locked` toggles
  `is_locked` in `stock_picking.py:1529-1532`.
- Core3 implementation: `pages/transfer-detail.yaml` is layout-only;
  `api/transfer-detail.yaml` owns the manager Lock / Unlock action,
  `is_locked` detail field, company/actor/current-row/cancelled guards, and
  durable timeline event. Migration
  `20260921090000-035-inventory-transfer-locks.yaml` adds the persisted lock
  column and deterministic default.
- Focused test:
  `bun test test/inventory_transfer_locks.integration.test.ts test/inventory_transfer_workflow.integration.test.ts`
  — PASS, 8 tests / 67 assertions. Coverage includes page/API/source
  contract, toggle/toggle-back, actor/company/stale/cancelled guards,
  `inventory.manage` permission denial, timeline/detail refresh, and restart.
- Authenticated Core3 evidence is in
  `evidence/inventory/2026-09-21/INV-TRANSFER-LOCK-001/`: desktop toggle,
  mobile persisted state, and JSON browser records. The isolated runtime
  passed with no page/request errors and 390px content width.
- Authenticated Odoo evidence is in the same directory. Desktop 1440x1000
  and mobile 390x844 reachable transfer forms omit Lock/Unlock because the
  supplied account lacks the source manager group. No Odoo mutation was made.

QA disposition: PASS for the bounded Core3 lock lifecycle, durable data,
permissions, and responsive evidence; PARTIAL for direct Odoo action parity
because of the exact manager-group blocker. Full Inventory sign-off remains
open.

## INV-TRANSFER-LABELS-001 — Transfer Product Labels (2026-09-21)

- Source/menu/action: PASS for the Odoo transfer-bound `Labels` server action;
  exact source references and the wizard branch are in the paired comparison.
- Core3 contract: PASS. Page/API separation, Product Labels/PDF form, durable
  label-run history, actor/company/row-version/state guards, permission, and
  deterministic fixture are present.
- Focused verification: PASS — `bun test
  test/inventory_transfer_labels.integration.test.ts` (4 tests, 20
  assertions). Coverage includes migration replay, restart persistence, wrong
  company, anonymous actor, stale/cancelled state, unsupported Lot/SN branch,
  and `inventory.write` denial.
- Browser/Odoo evidence: PARTIAL, not sign-off. Core3 isolated startup is
  blocked by the unrelated Ecommerce page-schema error
  (`services/ecommerce/api/wishlist.yaml`, `actions[4].fields`), and no Odoo
  mutation was attempted during finalization. See
  `evidence/inventory/2026-09-21/INV-TRANSFER-LABELS-001/`.
- Open follow-up: Lot/SN label layout, product label layout options/ZPL, and
  authenticated desktop/mobile captures once the shared discovery boundary is
  repaired.

## INV-TRANSFER-EMAIL-001 — Transfer email queue (2026-09-21)

- Source/menu/action: PASS for Odoo's `stock.picking` list/kanban-bound
  `action_lead_mass_mail` action and `mail.compose.message` composer; exact
  references and the Core3 mapping are in the paired source comparison.
- Core3 contract: PASS. Receipts/Deliveries page YAML remains presentation
  only; transfer APIs own the Send email form, durable queued outbox, actor,
  company, row-version, state, and content guards. The deterministic email
  fixture and transfer-detail history survive migration replay and restart.
- Focused verification: PASS — 8 tests / 73 assertions across
  `inventory_transfer_email` and `inventory_transfer_workflow`, including
  CRUD-like queue creation, permission denial, restart, stale/company/actor/
  cancelled/content guards, and no partial state.
- Browser evidence: PASS for authenticated Core3 desktop/mobile list and form
  capture at 1440x900 and 390x844, with no page errors, failed requests, or
  horizontal overflow. Odoo live paired screenshots/action execution were not
  captured in this bounded wave; no Odoo mutation or parity sign-off is
  claimed.
- Blockers/open scope: Core3 persists `Queued` outbox rows but does not send
  external SMTP mail. Odoo's bulk/multi-record mass-mail wizard and live
  authenticated visual comparison remain open.

## INV-PACKAGE-RELOCATE-001 — Package location relocation (2026-09-21)

- Source/menu/action: PASS for Packages and the package form Location write;
  source references are `stock_package_views.xml:29-70,144-164` and
  `stock_package.py:289-307`. Odoo rejects empty-package movement and moves
  positive contained quantities with the manual-relocation reason.
- Core3 contract: PASS. Package detail remains page/API separated; the API
  owns destination options, durable relocation history, and
  inventory.write/company/actor/state/row-version guards. A dedicated
  Core3-company fixture avoids weakening company scope.
- Focused verification: PASS — 8 tests / 53 assertions across
  `inventory_package_relocation` and `inventory_packages`, covering source
  mapping, mutation, same-location/invalid/empty/stale/company/actor guards,
  permission denial, migration replay, and restart persistence.
- Browser evidence: PASS for authenticated Core3 desktop/mobile package
  list/detail/Relocate form/result at 1440x900 and 390x844. Odoo live paired
  action execution was not captured; no Odoo mutation or visual parity
  sign-off is claimed.
- Open scope: full quant-chain/nested-package movement and Odoo bulk package
  list actions remain deferred. One benign desktop shell company request was
  aborted; the feature requests succeeded and mobile had no failed requests.
## Forecasted Report QA — `INV-STOCK-FORECAST-001` (2026-09-21)

- Odoo source/menu/action: PASS from source comparison. Stock menu/action is
  `stock.menu_product_stock` / `stock.action_product_stock_view`; product
  `View Availability` resolves the `stock_forecasted_product_product_action`
  client action. Exact file/line references are in the evidence comparison.
- Core3 contract: PASS. Stock list and Forecasted Report are page/API
  separated by `page.id`; the migration is replay-safe and the API persists
  report runs without changing stock quantities.
- Focused test:
  `bun test test/inventory_stock_forecast.integration.test.ts
  test/inventory_stock_report.integration.test.ts
  test/inventory_package_relocation.integration.test.ts` — PASS, 12 tests /
  97 assertions. Coverage includes deterministic report history, permission
  denial, current company, actor, empty, stale, and restart guards.
- Audit/diff: `bun run audit` PASS (693 pages, 702 routes, 1300 datasources);
  `git diff --check` PASS.
- Browser evidence: PASS for authenticated Core3 desktop/mobile at 1440x900
  and 390x844, with Forecasted Report lines/history, no page/request errors,
  and no horizontal overflow. Odoo login was reachable, but the bounded
  authenticated `/odoo/stock-report` capture did not render within the browser
  window; exact blocker is in the feature evidence. No Odoo mutation or
  parity sign-off is claimed.
## Stock product Locations QA — `INV-STOCK-LOCATIONS-001` (2026-09-21)

- Odoo source/menu/action: PASS from source comparison. The Stock row
  Locations action maps to `stock.action_view_quants`, with product and
  internal-location context; exact source references are in the evidence.
- Core3 contract: PASS. Stock report and product Locations are page/API
  separated by `page.id`; existing durable quants are queried and report runs
  are persisted through an idempotent migration.
- Focused test:
  `bun test test/inventory_stock_locations.integration.test.ts
  test/inventory_stock_report.integration.test.ts` — PASS, 8 tests / 76
  assertions. Coverage includes deterministic location rows, report CRUD-like
  history, permission denial, company, actor, empty, stale, migration replay,
  and restart guards.
- Browser evidence: PASS for authenticated Core3 desktop/mobile at 1440x900
  and 390x844, including the product location row, refresh history, no page/
  request errors, and no horizontal overflow. Odoo Stock rendered at both
  viewports, but its Locations button was group-gated for the supplied account;
exact blocker is recorded. No Odoo mutation or parity sign-off is claimed.

## Product Replenish wizard QA — `INV-PRODUCT-REPLENISH-001` (2026-09-21)

- Odoo source/menu/action: the product form binds
  `action_product_replenishment` and `action_product_template_replenishment`
  in `addons/stock/views/product_views.xml:39-85` to the `product.replenish`
  modal. The source form and Confirm action are in
  `addons/stock/wizard/product_replenish_views.xml:3-61`; defaults and
  `launch_replenishment` are in `product_replenish.py:9-115`.
- Core3: `pages/product-replenish.yaml` is layout-only and joins
  `api/product-replenish.yaml` by `page.id`. The stock row opens product
  context; the API owns context/catalog/history sources and the
  `inventory.product.replenish` server form. Migration 0.0.41 provides the
  durable request ledger and deterministic seed.
- Focused test: `bun test
  test/inventory_product_replenishment.integration.test.ts
  test/inventory_stock_report.integration.test.ts` — PASS, 8 tests / 76
  assertions. Coverage includes discovery, context/catalogs, request
  persistence, permission, actor/company/date/quantity/route/warehouse
  guards, row-version concurrency, replay, and restart.
- Core3/Odoo evidence is under
  `evidence/inventory/2026-09-21/INV-PRODUCT-REPLENISH-001/`. The supplied
  Odoo account did not reach the product-form modal in the bounded capture;
  the exact route/group blocker is recorded there. No Odoo mutation or full
  Inventory sign-off is claimed.

QA disposition: PASS for the bounded Core3 request lifecycle and permissions;
PARTIAL for direct Odoo modal comparison and downstream procurement
generation. Full Inventory sign-off remains open.

## Replenishment Information QA — `INV-REPLENISH-INFO-001` (2026-09-21)

- Odoo source/menu/action: `stock_orderpoint_views.xml:24-63,143` binds the
  orderpoint Replenishment Information and Forecast Description actions;
  `stock_replenishment_info.xml:3-61` and `stock_replenishment_info.py:16-267`
  define the transient context, graph, route choices, and Save behavior.
- Core3: `pages/replenishment-info.yaml` is layout-only and joins
  `api/replenishment-info.yaml` by `page.id`. The Replenishment list row opens
  product/warehouse context; the API owns demand/run/route sources and the
  manager-gated `inventory.replenishment.info.open` and `.save` actions.
  Migration 0.0.42 provides durable deterministic demand and report history.
- Focused test: `bun test
  test/inventory_replenishment_info.integration.test.ts
  test/inventory_replenishment.integration.test.ts` — PASS, 7 tests / 57
  assertions. Coverage includes discovery/separation, deterministic context
  and demand, durable report opens, Save Rule CRUD, permission, actor/company,
  range/route, stale-row guards, and restart persistence.
- Authenticated Core3 evidence: desktop 1440x900 and mobile 390x844 captures
  show the forecast chart, three demand rows, durable run history, Save Rule
  dialog/success, and no overflow or browser request errors.
- Authenticated Odoo evidence: desktop and mobile Replenishment screens render
  with no browser errors, but the supplied account exposes only Order,
  Automate, and Snooze; the source information action/wizard is not reachable.
  Exact comparison and screenshots are in
  `evidence/inventory/2026-09-21/INV-REPLENISH-INFO-001/`.

QA disposition: PASS for the bounded Core3 information/report and Save Rule
lifecycle; PARTIAL for direct Odoo wizard interaction and downstream
procurement generation. Full Inventory sign-off remains open.

## Warehouse Management Routes QA — `INV-ROUTES-001` (2026-09-21)

- Odoo source/menu/action: PASS from `addons/stock/views/stock_location_views.xml:174-268`
  and `addons/stock/models/stock_location.py:518-580`. `menu_routes_config`
  opens `action_routes_form` for `stock.route`; the source form includes
  company, warehouse, applicability flags, and related rules. The menu is
  restricted by `stock.group_adv_location`.
- Core3 contract: PASS. `pages/routes.yaml` and `pages/route-detail.yaml`
  are separate from `api/routes.yaml` and `api/route-detail.yaml`, joined by
  `page.id`. Migration 0.0.43 supplies deterministic routes/rules and the API
  owns durable list/create/edit/archive/restore/delete actions.
- Focused test: `bun test test/inventory_routes.integration.test.ts` — PASS,
  4 tests / 36 assertions. Coverage includes discovery, deterministic active /
  archived / shared rows, detail rules, manager CRUD, duplicate/company/
  row-version guards, archive/restore/delete-with-rules, migration replay,
  and restart reads.
- Core3 browser evidence: PASS for authenticated desktop 1440x900 and mobile
  390x844 list/detail/create/archive states. The archived detail visibly
  exposes Restore; there were no console errors, failed requests, bad
  responses, or horizontal overflow.
- Odoo comparison: PARTIAL. Authenticated desktop Inventory Configuration
  rendered, but the supplied account's menu omitted Routes because
  `stock.group_adv_location` was not granted. The bounded mobile probe did not
  reach Configuration before timeout. No Odoo mutation was attempted; the
  desktop capture and exact blockers are in the paired evidence.

QA disposition: PASS for the bounded Core3 Routes lifecycle and guards;
PARTIAL for direct Odoo Routes interaction. Full Inventory sign-off remains
open.

## Warehouse Management Storage Categories QA — `INV-STORAGE-CATEGORIES-001` (2026-09-21)

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_storage_category_views.xml:3-100` and
  `addons/stock/models/stock_storage_category.py:7-74`. The list/form action
  exposes name, max weight, product policy, company, product/package capacity
  grids, and Locations; `menu_storage_categoty_config` requires
  `stock.group_stock_multi_locations`.
- Core3 contract: PASS. `pages/storage-categories.yaml` and
  `pages/storage-category-detail.yaml` are separate from
  `api/storage-categories.yaml` and `api/storage-category-detail.yaml`, joined
  by `page.id`. Migration 0.0.44 persists categories, capacity rules, and
  location assignments.
- Focused test: `bun test test/inventory_storage_categories.integration.test.ts`
  — PASS, 4 tests / 35 assertions. Coverage includes deterministic active
  fixtures, shared-company scope, reader access versus manager mutations,
  duplicate/invalid/in-use guards, parent and line row versions, migration
  replay, and restart reads.
- Core3 browser evidence: PASS for authenticated desktop 1440x900 and mobile
  390x844 list/detail states showing seeded capacities and Shelf 1 assignment;
  create form capture is also present. Both viewports had equal document and
  viewport widths and no console/request/HTTP errors.
- Odoo comparison: BLOCKED. The bounded authenticated probe recorded a failed
  `POST /web/login` for `codex@core3.local`; therefore no authenticated Odoo
  screenshot or mutation is treated as evidence. Source/menu/group facts and
  the exact blocker are recorded in the paired evidence.

QA disposition: PASS for the bounded Core3 Storage Categories lifecycle and
guards; BLOCKED for live Odoo comparison. Full Inventory sign-off remains
open.

## Warehouse Management Putaway Rules QA — `INV-PUTAWAY-RULES-001` (2026-09-21)

- Odoo source/menu/action: PASS from
  `addons/stock/views/product_strategy_views.xml:3-107` and
  `addons/stock/models/product_strategy.py:17-95`. `action_putaway_tree`
  exposes the editable rule list and search/group filters; `menu_putaway`
  requires `stock.group_stock_multi_locations`. The source rule supports
  product/category target, arrival/store locations, package type, storage
  category, priority, company, active, and three sublocation strategies.
- Core3 contract: PASS. `pages/putaway-rules.yaml` and
  `pages/putaway-rule-detail.yaml` are separate from
  `api/putaway-rules.yaml` and `api/putaway-rule-detail.yaml`, joined by
  `page.id`. Migration 0.0.45 supplies deterministic active/archived rules.
- Focused test: `bun test test/inventory_putaway_rules.integration.test.ts` —
  PASS, 4 tests / 33 assertions. Coverage includes current-company filtering,
  option catalogs, target/strategy/location validation, duplicate/company
  guards, manager CRUD, archive/restore, stale rows, migration replay, and
  restart persistence.
- Core3 browser evidence: PASS for authenticated desktop 1440x900 and mobile
  390x844 list/detail/create states. Seeded product/category, Input, Small Bin,
  and Closest Location context rendered; both viewports had equal document and
  viewport widths with no browser errors.
- Odoo comparison: BLOCKED. The bounded authenticated probe remained at
  `/web/login` for `codex@core3.local` at both viewports, so no Odoo Putaway
  Rules menu or record state is claimed and no mutation was attempted.

QA disposition: PASS for the bounded Core3 Putaway Rules lifecycle and guards;
BLOCKED for live Odoo comparison. Full Inventory sign-off remains open.

## Inventory Overview QA — `INV-OVERVIEW-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_picking_type_views.xml:16-39,180-293`.
  `stock_picking_type_menu` opens `stock_picking_type_action` at
  `/odoo/inventory`; the source kanban exposes Ready, Waiting, Late, Back
  Orders, Operations, and operation-kind-specific queue labels.
- Core3 contract: PASS. `pages/overview.yaml` is presentation-only and
  `api/overview.yaml` owns the two datasources and queue action under
  `page.id: inventory-overview`. Migration 0.0.46 adds durable overview-open
  history and a deterministic opening fixture.
- Focused test: `bun test test/inventory_overview.integration.test.ts` — PASS,
  4 tests / 22 assertions. Coverage includes discovery/separation, cards and
  history, reader boundary, actor/company/filter/stale guards, migration
  replay, and restart persistence. `bun run audit` — PASS, 705 pages, 714
  routes, 1,340 datasources. `git diff --check` — PASS.
- Core3 browser evidence: PASS for authenticated desktop 1440x900 and mobile
  390x844 card and Open operation queue states. Four cards and seeded history
  render; both viewports have no horizontal overflow, console errors, failed
  requests, or bad HTTP responses. Evidence is under
  `evidence/inventory/2026-09-21/INV-OVERVIEW-001/`.
- Odoo comparison: PASS for authenticated desktop/mobile `/odoo/inventory`.
  Receipts, Delivery Orders, and PoS Orders render. Paired evidence records
  deterministic fixture/count differences and four unrelated mobile Discuss
  avatar aborts; no Odoo mutation was attempted.

QA disposition: PASS for the bounded Core3 Overview card/queue lifecycle and
guards; PARTIAL for exact Odoo fixture/menu-card parity because New,
configuration, reporting links, and source-specific card counts remain open.
Full Inventory sign-off remains open.
## Inventory Product Attributes QA — `INV-PRODUCT-ATTRIBUTES-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_menu_views.xml:22-27`,
  `addons/product/views/product_attribute_views.xml:3-102`, and
  `addons/product/models/product_attribute.py:19-92` plus
  `product_attribute_value.py:19-137`. The source action is
  Configuration > Products > Attributes, with list/form and inline values,
  gated by `product.group_product_variant`.
- Core3 contract: PASS. Separate `pages/product-attributes.yaml` and
  `pages/product-attribute-detail.yaml` pair with
  `api/product-attributes.yaml` and `api/product-attribute-detail.yaml` by
  `page.id`; migration 0.0.51 persists source-shaped attributes and values.
- Focused test: `bun test test/inventory_product_attributes.integration.test.ts`
  — PASS, 4 tests / 43 assertions. Coverage includes contract separation,
  deterministic fixtures, manager CRUD, duplicate and source constraint
  guards, global/shared company boundary, used-on-products protection, reader/manage permissions, migration
  replay, row versions, and restart persistence.
- Core3 browser evidence: authenticated desktop 1440x900 and mobile 390x844
  list/detail captures, response checks, page-error checks, and overflow
  checks are under `evidence/inventory/2026-09-21/INV-PRODUCT-ATTRIBUTES-001/`
  (`core3-desktop-{list,detail}.png`, `core3-mobile-{list,detail}.png`, and
  `core3-browser.json`).
- Odoo comparison: source/menu comparison is PASS. The live Odoo probe is
  recorded as authenticated only if the route renders; otherwise the exact
  login or group blocker is recorded in paired evidence. No Odoo mutation is
  claimed.

QA disposition: PASS for the bounded Core3 Product Attributes lifecycle and
guards; PARTIAL/BLOCKED for any unavailable live Odoo visual or mutation
comparison. Full Inventory sign-off remains open.
## Inventory Product Templates QA — `INV-PRODUCT-TEMPLATES-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/product_views.xml:637-664`, stock template extensions at
  `:118-132,176-250`, and product template fields at
  `addons/product/models/product_template.py:44-179,246-251`. The source
  action is Products > Products, model `product.template`, with
  `kanban,list,form` and default Goods/storable context.
- Core3 contract: PASS. Separate `pages/product-templates.yaml` and
  `pages/product-template-detail.yaml` pair with
  `api/product-templates.yaml` and `api/product-template-detail.yaml` by
  `page.id`; migration 0.0.52 persists the source-shaped template lifecycle.
- Focused test: `bun test test/inventory_product_templates.integration.test.ts`
  — PASS, 4 tests / 42 assertions. Coverage includes direct contract
  validation, deterministic variant/stock aggregates, manager CRUD, current
  company/shared boundary, type/tracking/number guards, variant delete guard,
  reader/manage permissions, row versions, migration replay, and restart.
- Core3 browser evidence: authenticated desktop 1440x900 and mobile 390x844
  list/detail captures with response, page-error, and overflow checks are in
  `evidence/inventory/2026-09-21/INV-PRODUCT-TEMPLATES-001/`.
- Odoo comparison: source/menu comparison is PASS; the bounded live result or
  exact login/route blocker is recorded in paired evidence. No Odoo mutation is
  claimed.

QA disposition: PASS for the bounded Core3 Product Templates lifecycle and
guards; PARTIAL/BLOCKED for any unavailable live Odoo visual or mutation
comparison. Full Inventory sign-off remains open.

## Inventory Transfer Scrap QA — `INV-TRANSFER-SCRAP-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_picking_views.xml:502-511`. The form-bound
  `stock.action_scrap` server action is named Scrap for `stock.picking` and
  invokes `records.button_scrap()`.
- Core3 contract: PASS. `pages/transfer-detail.yaml` owns the visible Scrap
  button and history list; `api/transfer-detail.yaml` owns the
  `stock.picking.action_scrap` mutation and datasource, joined by
  `page.id: transfer-detail`. Migration 0.0.53 persists transfer-bound runs
  and deterministic test data.
- Focused test: `bun test
  test/inventory_transfer_scrap.integration.test.ts` — PASS, 4 tests / 23
  assertions. Coverage includes contract validation, Draft scrap CRUD,
  company/actor/state/input/row-version guards, write permission, migration
  replay, and file-backed restart persistence.
- Core3 browser evidence: authenticated desktop 1440x900 and mobile 390x844
  transfer-detail captures, source responses, page-error and overflow checks
  are under `evidence/inventory/2026-09-21/INV-TRANSFER-SCRAP-001/`.
- Odoo comparison: source/menu comparison is PASS. The live probe result is
  paired evidence; if the supplied runtime is at `/web/login`, no Odoo visual
  or mutation is claimed.

QA disposition: PASS for the bounded Core3 transfer Scrap lifecycle and
guards; PARTIAL/BLOCKED for live Odoo visual/mutation comparison when the
authenticated route is unavailable. Full Inventory sign-off remains open.

## Inventory Revert Adjustment QA — `INV-MOVE-REVERT-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_move_line_views.xml:215-221` and
  `addons/stock/models/stock_move_line.py:1181-1218`. The bound server action
  is `action_revert_inventory_adjustment` on `stock.move.line` and calls
  `action_revert_inventory()`.
- Core3 contract: PASS. `pages/move-line-detail.yaml` owns the manager-only
  header action and reversal history list; `api/move-line-detail.yaml` owns
  the action/datasource, joined by `page.id: move-line-detail`. Migration 0.0.54
  persists reversal history and reverse move lines.
- Focused test: `bun test
  test/inventory_move_revert.integration.test.ts` — PASS, 4 tests / 24
  assertions. Coverage includes contract separation, reverse move CRUD,
  company/actor/adjustment/stale/duplicate guards, write permission,
  migration replay, and file-backed restart persistence.
- Core3 browser evidence: authenticated desktop 1440x900 and mobile 390x844
  move-line detail captures, source responses, page-error and overflow checks
  are under `evidence/inventory/2026-09-21/INV-MOVE-REVERT-001/`.
- Odoo comparison: source/menu/action comparison is PASS. The paired live
  result records the exact authenticated route or login blocker; no Odoo
  mutation is claimed when the route is unavailable.

QA disposition: PASS for the bounded Core3 reversal lifecycle and guards;
PARTIAL/BLOCKED for unavailable live Odoo visual/mutation comparison. Full
Inventory sign-off remains open.

## Inventory Package Remove QA — `INV-PACKAGE-REMOVE-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_package_views.xml:98-105` and
  `addons/stock/models/stock_package.py:369-406`. The editable transfer-pack
  list action is `action_remove_package`; it removes package move-line links
  from the active transfer/container tree.
- Core3 contract: PASS. `pages/package-detail.yaml` owns the
  Remove from Transfer action and removal history list; `api/package-detail.yaml`
  owns the transfer selector, datasource, and `stock.package.action_remove_package`
  mutation, joined by `page.id: package-detail`. Migration 0.0.55 persists the
  same-company fixture and audit rows.
- Focused test: `bun test
  test/inventory_package_remove.integration.test.ts` — PASS, 4 tests / 24
  assertions. Coverage includes contract separation, relation removal,
  company/actor/open-transfer/link/stale guards, write permission, migration
  replay, and file-backed restart persistence.
- Core3 browser evidence: authenticated desktop 1440x900 and mobile 390x844
  package-detail captures, source responses, page-error and overflow checks
  are under `evidence/inventory/2026-09-21/INV-PACKAGE-REMOVE-001/`.
- Odoo comparison: source/menu/action comparison is PASS. The paired live
  result records the exact authenticated route or login blocker; no Odoo
  mutation is claimed when the route is unavailable.

QA disposition: PASS for the bounded Core3 package removal lifecycle and
guards; PARTIAL/BLOCKED for unavailable live Odoo visual/mutation comparison.
Full Inventory sign-off remains open.

## Inventory Operation Type Ready Moves QA — `INV-OP-TYPE-READY-MOVES-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_picking_type_views.xml:279-286`,
  `addons/stock/models/stock_picking.py:472-473`, and
  `addons/stock/views/stock_picking_views.xml:609-616`. The Operations link
  calls `stock.action_get_picking_type_ready_moves` for the active operation
  type, with the Ready search context.
- Core3 contract: PASS. `pages/operation-type-detail.yaml` owns the
  permissioned Operations drilldown and
  `pages/operation-type-ready-moves.yaml` owns the desktop/mobile report
  surface; `api/operation-type-detail.yaml` and
  `api/operation-type-ready-moves.yaml` own the route/action/datasources,
  joined by `page.id`. Migration 0.0.56 persists the deterministic fixture.
- Focused test: `bun test
  test/inventory_operation_type_ready_moves.integration.test.ts` — PASS,
  4 tests / 23 assertions. Coverage includes exact source markers, schema and
  discovery, Ready unfinished move filtering, read permission, company
  boundary, migration replay, and file-backed restart persistence.
- Core3 browser evidence: authenticated desktop 1440x900 and mobile 390x844
  captures, response/error/overflow checks, and the exact Odoo live result are
  under `evidence/inventory/2026-09-21/INV-OP-TYPE-READY-MOVES-001/`.

QA disposition: PASS for the bounded Core3 Ready Moves read/drilldown
contract and persistence; PARTIAL/BLOCKED for paired live Odoo visual or
mutation comparison if the supplied Odoo session is unavailable. Full
Inventory sign-off remains open.

## Inventory Warehouse Resupply From QA — `INV-WAREHOUSE-RESUPPLY-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_warehouse_views.xml:40-44` and
  `addons/stock/models/stock_warehouse.py:83-88`. The Warehouse Configuration
  form exposes `resupply_wh_ids` with a different-warehouse, same-company
  domain and stores the relation in `stock_wh_resupply_table`.
- Core3 contract: PASS. `pages/warehouse-detail.yaml` owns the visible
  Resupply From list/Add form and `api/warehouse-detail.yaml` owns options,
  durable relation actions, and guards; both retain `page.id: warehouse-detail`.
  Migration 0.0.57 persists the deterministic relation.
- Focused test: `bun test
  test/inventory_warehouse_resupply.integration.test.ts` — PASS, 4 tests / 29
  assertions. Coverage includes source markers, discovery, relation/options,
  Add/Remove CRUD, manager permission, company/actor/duplicate/stale guards,
  migration replay, and file-backed restart persistence.
- Core3 browser evidence: authenticated desktop/mobile warehouse detail and
  Add form captures, no request/page errors, and no horizontal overflow are
  under `evidence/inventory/2026-09-21/INV-WAREHOUSE-RESUPPLY-001/`.
- Odoo comparison: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; authenticated
  paired Odoo visual/action evidence is blocked and not claimed.

QA disposition: PASS for the bounded Core3 durable Resupply From setting;
PARTIAL/BLOCKED for paired live Odoo visual/mutation comparison. Automatic
route generation and full Inventory sign-off remain open.

## Inventory Transfer Print QA — `INV-TRANSFER-PRINT-001`

- Odoo source/menu/action: PASS from
  `addons/stock/views/stock_picking_views.xml:127-128`,
  `addons/stock/models/stock_picking.py:1175-1177`, and
  `addons/stock/report/stock_report_views.xml:14-25`. Ready transfers use
  `stock.picking.do_print_picking` / `stock.action_report_picking`; Done
  transfers use `stock.action_report_delivery` / Delivery Slip.
- Core3 contract: PASS. `pages/transfer-detail.yaml` owns the two state-specific
  Print buttons and responsive history list; `api/transfer-detail.yaml` owns
  the paired report actions and datasource. Migration 0.0.58 adds the durable
  ledger, printed flag, and Ready/Done fixtures.
- Focused verification: PASS — 4 feature tests / 35 assertions plus 3 transfer
  regression tests / 18 assertions. Coverage includes report selection,
  printed-state semantics, migration replay, restart persistence, company,
  actor, state, move-line, stale-row, and read/write permission boundaries.
- Core3 browser evidence: PASS for authenticated Ready and Done transfer
  details on desktop 1440x900 and mobile 390x844. Print clicks rendered the
  expected Picking Operations or Delivery Slip history; request/page errors
  were empty and viewport/body widths matched.
- Odoo comparison: BLOCKED. `GET http://localhost:8069/web` returned HTTP 303
  to `/web/login?redirect=%2Fweb%3F`; paired authenticated report screenshots
  and action execution are not claimed. Exact JSON is in the feature evidence.
- Audit/lint/diff: PASS — 723 pages / 732 routes / 1,402 datasources; scoped
  TypeScript ESLint passed; `git diff --check` passed.

QA disposition: PASS for the bounded Core3 durable transfer Print lifecycle;
PARTIAL/BLOCKED for paired live Odoo visual/action comparison. Full Inventory
sign-off remains open.
