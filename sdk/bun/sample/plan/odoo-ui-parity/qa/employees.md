# employees QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/employees-desktop.png and employees-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable employees assignment (pending wave dispatch)
Module owner: employees module owner
Verification trigger: feature-complete
Candidate commit: current working tree

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Employee action-mode and training-attendance contracts pass in focused
  reruns after menu inventory assertions were reconciled.
- Focused Employees suite: `bun test ./test/employees*.integration.test.ts --timeout 20000` — 50 passed, 0 failed, 617 assertions across 16 files.
- Authenticated module-scoped route smoke covered 27 registered routes at desktop and mobile. 47/54 bare-route checks were clean; six affected detail/list states were isolated with valid seeded IDs and passed at mobile with no browser or request errors. Bare detail routes without an `id` are not treated as valid record-state acceptance inputs.
- Fleet user permission boundary: `/employees/settings` returned HTTP 403 with `Requires permission: employees.settings`, with no browser errors.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EMPLOYEES-FUNC-001 | Focused functionality, catalog CRUD, settings, records, and Work-tab contracts | 50 tests, 617 assertions; focused suite passed | pass |
| EMPLOYEES-BROWSER-001 | Authenticated module route and seeded detail-state smoke | 27 routes × desktop/mobile; valid-ID retests passed for affected mobile states | partial pass |
| EMPLOYEES-PERM-001 | Non-manager cannot open Employees settings | Fleet user received HTTP 403 with `Requires permission: employees.settings`; browser errors 0 | pass |
| EMPLOYEES-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Functional and permission evidence present; complete parameterized route matrix and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EMPLOYEES-BROWSER-001 | Initial bare-route smoke used missing IDs for some record detail routes and produced empty states; several mobile checks also observed late lazy-asset requests while changing routes | — | Valid seeded IDs for certifications, departure reasons, work locations, and schedules passed in isolated mobile probes | follow-up |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
