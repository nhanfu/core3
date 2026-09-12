# point-of-sale QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/point-of-sale-desktop.png and point-of-sale-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress

## Wave QA fallback (2026-09-13)

- `point_of_sale.integration.test.ts`: **13 passed, 69 assertions, 0
  failures** after the POS Orders route repair in candidate `6f86243c`.
- The route contract and existing POS session/payment/preset checks pass.
- Browser interaction, actor/restart matrix, and paired Odoo comparison
  remain open; this is not module sign-off.
QA slot: dispatchable point-of-sale assignment (pending wave dispatch)
Module owner: point-of-sale module owner
Verification trigger: feature-complete
Candidate commit: `d5fab7ee`

Detailed execution matrix: [`test-plans/point-of-sale.md`](test-plans/point-of-sale.md). It is the module-level source for the remaining route, CRUD, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| POINT_OF_SALE-001 | POS focused contract corpus | 84 focused tests / 700 assertions across 24 files | PASS |
| POINT_OF_SALE-002 | Touch route responsive render | Authenticated `/point-of-sale/touch` rendered at 1440x900 and 390x844 with House coffee, no page/request errors, HTTP failures, or overflow | PASS |
| POINT_OF_SALE-003 | Cashier persistence and payment guards | Opening cash persisted; product add recalculated 7.70; overpayment 400; Cash payment persisted Paid 7.70 | PASS |
| POINT_OF_SALE-004 | Permission boundary | Fleet payment attempt returned 403 `pos.write` | PASS |
| POINT_OF_SALE-004A | POS Orders row interaction | `view_pos_order` resolves to the registered `/point-of-sale/order-detail` page and preserves the row ID parameter; focused parity file 13/13, 69 assertions | PASS |
| POINT_OF_SALE-005 | Complete route interaction and fresh paired Odoo comparison | Existing module captures are recorded, but current-wave full route interaction and paired adjudication are incomplete | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| POINT_OF_SALE-BROWSER-001 | Initial full-route harness reused a page and captured late requests from the previous route | — | Discarded; isolated touch contexts rerun cleanly | closed |

## Sign-off

- Functional: pass for the tested cashier/touch slice and POS Orders row route contract
- Permissions: pass for the tested write boundary
- Persistence/data integrity: pass for the tested session/order/payment flow
- Desktop/mobile visual parity: pass for touch route only; module parity pending
- Tester decision: conditional; broader route and paired Odoo gates remain open
