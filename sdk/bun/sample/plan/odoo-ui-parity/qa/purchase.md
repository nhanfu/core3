# purchase QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/purchase-desktop.png and purchase-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable purchase assignment (pending wave dispatch)
Module owner: purchase module owner
Verification trigger: feature-complete
Candidate commit: none

## Current regression evidence (2026-09-12)

- Focused Purchase suite: `bun test ./test/purchase*.integration.test.ts --timeout 20000` — 55 passed, 534 assertions, 0 failed across 17 files.
- Fresh authenticated route matrix on module runner port 4031: 23 registered
  route states × desktop/mobile = 46/46, with no page errors, failed requests,
  redirect/blank states, or horizontal overflow.
- Authenticated Administrator PO detail workflow: `po-demo-005` Acknowledge
  clicked through the UI, `/api/mutate` returned 200, the action disappeared,
  and the state remained correct after reload. Capture:
  `/tmp/core3-purchase-acknowledge-desktop.png`.
- Full Odoo/Core3 comparison and complete browser CRUD remain open.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| PURCHASE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Detailed plan approved; current functional and route-smoke evidence recorded, but paired Odoo and full browser CRUD are open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| PURCHASE-001 | Authenticated route and acknowledge smoke | 46/46 route checks; PO acknowledge returned 200 and persisted after reload | PASS |

## Sign-off

- Functional: pass for tested contracts and acknowledge workflow
- Permissions: partial; contract boundaries pass, fresh ordinary-user browser probe remains open
- Persistence/data integrity: pass for tested PO acknowledgement and focused mutations
- Desktop/mobile visual parity: route smoke pass; paired Odoo comparison pending
- Tester decision: conditional; full CRUD, permission actor matrix, and paired Odoo gates remain open
