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
| INV-SET-09 | Odoo paired desktop/mobile visual comparison | PARTIAL | Packages paired at both viewports; Settings pair remains open |

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
