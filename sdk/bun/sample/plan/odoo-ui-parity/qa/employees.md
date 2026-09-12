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
- Current dependency-free module runner on port 4037 passed all 28 manifest
  routes at desktop/mobile: 56/56 with no page errors, failed requests, HTTP
  errors, blank states, or horizontal overflow.
- Authenticated mobile employee detail workflow after the archive-action fix:
  Archive returned 200 and changed the visible action to Restore after reload;
  Restore returned 200 and returned the visible action to Archive.
- The detailed per-module checklist is approved at
  `qa/test-plans/employees.md`.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EMPLOYEES-FUNC-001 | Focused functionality, catalog CRUD, settings, records, and Work-tab contracts | 51 tests, 625 assertions; focused suite passed | pass |
| EMPLOYEES-BROWSER-001 | Authenticated module route and seeded detail-state smoke | 28 routes × desktop/mobile = 56/56 with valid seeded detail states | pass |
| EMPLOYEES-PERM-001 | Non-manager cannot open Employees settings | Fleet user received HTTP 403 with `Requires permission: employees.settings`; browser errors 0 | pass |
| EMPLOYEES-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Focused suite, corrected archive/restore workflow, complete route matrix, and permission boundary are recorded; paired Odoo and broader actor/CRUD coverage remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EMPLOYEES-BROWSER-001 | Initial bare-route smoke used missing IDs for some record detail routes and produced empty states; several mobile checks also observed late lazy-asset requests while changing routes | — | Corrected matrix with seeded IDs passed 56/56 | fixed |
| EMPLOYEES-FUNC-001 | Archive action submitted the entire form state, so `defaults.active=false` was overwritten by `active=true`; API returned 200 without archiving | current change | Explicit action params and concurrency guard; browser Archive/Restore retest passed after restart | fixed |

## Sign-off

- Functional: pass for tested contracts and employee archive/restore
- Permissions: partial; settings denial and contract boundaries pass, broader actor matrix remains
- Persistence/data integrity: partial pass; archive/restore survives reload, restart and full CRUD evidence remain
- Desktop/mobile visual parity: route smoke pass; paired Odoo comparison pending
- Tester decision: conditional; paired Odoo, actor, and broader CRUD gates remain open
