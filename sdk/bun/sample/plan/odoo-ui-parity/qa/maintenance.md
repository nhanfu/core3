# maintenance QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/maintenance-desktop.png and maintenance-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable maintenance assignment (pending wave dispatch)
Module owner: maintenance module owner
Verification trigger: feature-complete
Candidate commit: none

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

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MAINTENANCE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Detailed plan approved; focused contracts, route matrix, and request cancel persistence are recorded, but full CRUD and paired Odoo gates remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| MAINTENANCE-001 | Focused contracts and authenticated route/workflow smoke | 32 tests/316 assertions; 32/32 route checks; Cancel → Reopen action state persisted after reload | PASS |

## Sign-off

- Functional: pass for tested contracts and request lifecycle
- Permissions: partial; contract guards pass, fresh actor matrix remains open
- Persistence/data integrity: pass for tested cancel/reopen behavior
- Desktop/mobile visual parity: route smoke pass; paired Odoo comparison pending
- Tester decision: conditional; full CRUD, actor, integration, and paired Odoo gates remain open
