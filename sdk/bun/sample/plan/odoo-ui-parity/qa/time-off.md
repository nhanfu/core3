# time-off QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/time-off-desktop.png and time-off-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable time-off assignment (pending wave dispatch)
Module owner: time-off module owner
Verification trigger: feature-complete
Candidate commit: `84d1b83c`

Detailed execution matrix: [`test-plans/time-off.md`](test-plans/time-off.md). It is the module-level source for requests, allocations, approvals, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

## Current regression evidence

- Focused Time Off suite: `bun test ./test/time_off*.integration.test.ts --timeout 20000` — 45 passed, 0 failed, 485 assertions across 17 files.
- Authenticated registered-menu route matrix: 16 unique routes at desktop and mobile — 32/32 passed with no blank/redirect result, browser error, HTTP error, or horizontal overflow; raw result: `/tmp/core3-odoo-parity/timeoff-matrix-20260912.json`.
- Authenticated approval workflow: created `QA Browser Leave 20260912`, submitted it, and approved it; all responses were 200 and row versions advanced `1 → 2 → 3`, with approver `Admin User` and state `Approved`.
- Permission boundary: Fleet user opening `/time-off/time-off-approval` received the expected 403 `Requires permission: time_off.manage`; no browser errors were recorded.
- Authenticated state-flow probe: a leave request reached `Refused` through Draft → Submitted → Refused, and a second request reached `Cancelled` through Draft → Submitted → Approved → Cancelled with `cancellation_reason` persisted; both sequences returned 200 and row versions advanced to 3 and 4 respectively.

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| TIME_OFF-FUNC-001 | Focused functionality, reports, CRUD, and guards | 45 tests, 485 assertions; focused suite passed | pass |
| TIME_OFF-BROWSER-001 | Authenticated registered-menu route matrix | 16 routes × desktop/mobile = 32/32; raw JSON result recorded | pass |
| TIME_OFF-WORKFLOW-001 | Create, submit, and approve leave request | Authenticated sequence returned 200 at each step; row versions 1 → 2 → 3 | pass |
| TIME_OFF-PERM-001 | Non-manager cannot open manager approval view | Fleet user received HTTP 403 with `Requires permission: time_off.manage`; browser errors 0 | pass |
| TIME_OFF-WORKFLOW-002 | Refuse and cancel approved leave requests | Authenticated refusal and approved-cancellation sequences returned 200; final states and cancellation reason persisted; row versions 1 → 3 and 1 → 4 | pass |
| TIME_OFF-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Functional and route evidence present; complete Odoo visual comparison and all permission boundaries remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave defect recorded | — | — | pending |

## Sign-off

- Functional: partial pass (focused suite and approval workflow pass)
- Permissions: partial pass (route access verified; role-specific mutation boundaries remain)
- Persistence/data integrity: partial pass (request creation and state persistence verified)
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
