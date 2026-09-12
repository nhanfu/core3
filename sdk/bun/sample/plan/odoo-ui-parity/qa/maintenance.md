# maintenance QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/maintenance-desktop.png and maintenance-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: QA-1 (single-module assignment)
Module owner: maintenance module owner
Verification trigger: feature-complete
Candidate commit: 02bb85ec

## QA wave execution (2026-09-13)

- Candidate under test: `02bb85ec` (permissioned Maintenance Request detail
  edit slice). No product files were changed by QA.
- Focused verification: `bun test ./test/maintenance*.integration.test.ts
  --timeout 20000` — **33 passed, 322 assertions, 0 failed**, across 13
  files. This validates the declarative contracts, migration idempotency,
  request/equipment/team/category/stage/activity-type mutations, workflow
  guards, and repository-level persistence checks.
- Stable authenticated browser retry used one isolated memory runner:
  backend `http://127.0.0.1:4335`, frontend `http://localhost:3035`,
  `admin@tms.local`, Chromium via `/usr/bin/google-chrome`.
  `/maintenance/maintenance-requests` and
  `/maintenance/maintenance-requests/detail?id=maintenance-demo-001` both
  rendered at 1440x900 and 390x844 with zero console errors, page errors, or
  failed requests, and no horizontal overflow. Screenshots:
  `/tmp/core3-odoo-parity/maintenance-qa-desktop-retry.png` and
  `/tmp/core3-odoo-parity/maintenance-qa-mobile-retry.png`.
- Direct authenticated boundary checks on the same runner: unauthenticated
  request list `401 UNAUTHORIZED`; admin request list/detail `200`; ordinary
  Fleet user request list/detail `403`; Fleet request update `403` with no
  mutation. Admin invalid edit values returned `422
  MAINTENANCE_REQUEST_REQUIRED`.
- Concurrency check: a changed stale replay returned `409 STALE_RECORD` and
  did not overwrite the record. An identical stale replay returned `200`
  without changing data because the generic mutation runtime short-circuits
  unchanged updates before evaluating `expected_row_version`. This is an open
  finding against the detailed plan’s requirement that any stale update return
  `409`; QA did not modify product code.
- Browser coverage is limited to the request list/detail slice. Full menu
  traversal, browser edit/create controls, all actor/company scopes, settings,
  activities, recurrence, paired Odoo comparison, and the remaining 16-route
  matrix are not signed off.

QA decision: **conditional fail / return to developer** for the stale no-op
concurrency finding; all executed focused checks pass otherwise.

## Current regression evidence (2026-09-12)

- Focused Maintenance suite: `bun test ./test/maintenance*.integration.test.ts --timeout 20000` — 32 passed, 316 assertions, 0 failed across 12 files.
- Fresh authenticated module runner on port 4032 checked 16 registered routes
  at desktop/mobile: 32/32 passed with no page errors, failed requests,
  redirect/blank states, or horizontal overflow.
- Administrator browser workflow on `maintenance-demo-001`: clicked Cancel,
  `/api/mutate` returned 200, the action changed to Reopen Request, and the
  cancelled state remained after reload.
- Paired Odoo comparison, full browser CRUD, settings, and ordinary-user
  browser permission evidence remain open.

## Current bounded slice (2026-09-13)

- Added the permissioned `edit_maintenance_request_detail` server form and
  `maintenance.requests.update` mutation. It edits the request identity,
  description/instructions, priority, assignment, schedule, and recurrence.
- The mutation requires `maintenance.write`, rejects archived or missing
  requests, validates required fields and duplicate names, and requires the
  current `row_version`.
- `maintenance_request_edit.integration.test.ts`: 1 passed, 6 assertions;
  the update persisted `maintenance-demo-001` at row version 2 and a stale
  replay returned 409 without overwriting it.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MAINTENANCE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Detailed plan approved; focused contracts, route matrix, and request cancel persistence are recorded, but full CRUD and paired Odoo gates remain open | pending |
| MAINT-FUNC-003 | Request detail edit contract | `maintenance_request_edit.integration.test.ts`; authenticated admin detail render; direct update persistence and stale-write checks | API persistence and changed-value stale guard pass; browser edit control and identical stale replay remain open |
| MAINT-PERM-003 | Ordinary Fleet user mutation boundary | Authenticated direct API on isolated runner; Fleet update returned `403` and admin record remained unchanged | pass for request update boundary; full Maintenance mutation matrix remains pending |
| MAINT-PERM-006 | Unauthenticated request boundary | Direct request-list API returned `401 UNAUTHORIZED`; authenticated admin browser request list/detail rendered | pass for tested request routes; all-route expiry/browser redirect coverage remains pending |
| MAINT-QA-001 | Identical stale update replay | Isolated HTTP `/api/mutate`: first update advanced row version; same payload with old `expected_row_version` returned `200` | **open** — no-op update bypasses concurrency guard; expected `409 STALE_RECORD` |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| MAINTENANCE-001 | Focused contracts and authenticated route/workflow smoke | 32 tests/316 assertions; 32/32 route checks; Cancel → Reopen action state persisted after reload | PASS |
| MAINT-QA-001 | Identical stale update replay bypasses row-version check | None; QA-only finding against `02bb85ec`; changed stale replay still returns `409 STALE_RECORD` | Reproduced on isolated runner `:4335`; same stale payload returned HTTP 200 | OPEN |

## Sign-off

- Functional: pass for executed repository contracts and request edit/lifecycle checks; browser edit control remains unverified
- Permissions: pass for tested request read/write denial boundary; full actor/company matrix remains open
- Persistence/data integrity: pass for changed-value updates and lifecycle; identical stale no-op replay is open
- Desktop/mobile visual parity: authenticated request list/detail smoke pass; paired Odoo comparison pending
- Tester decision: **conditional fail / return to developer** for `MAINT-QA-001`; full CRUD, actor, integration, and paired Odoo gates remain open
