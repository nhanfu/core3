# point-of-sale QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/point-of-sale-desktop.png and point-of-sale-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: QA-2
Module owner: point-of-sale module owner
Verification trigger: feature-complete
Candidate commit: `cdbc38ee`

## QA-2 verification of integrated candidate `cdbc38ee` (2026-09-13)

- POS corpus: **84 passed, 700 assertions, 0 failures** across 24 files in
  104.67s (`bun test ./test/pos*.integration.test.ts --timeout 20000`).
- `bun run audit`: **659 pages, 668 routes, 1,134 datasources**, passed.
- Authenticated desktop route matrix: **72/72 registered POS routes loaded**
  at 1440x900; 0 console errors, 0 page errors, 0 failed requests, 0 HTTP
  responses >=400, and 0 horizontal-overflow results.
- Authenticated mobile smoke for `/point-of-sale/touch`,
  `/point-of-sale/orders`, and `/point-of-sale/configs` at 390x844 rendered
  with `overflow=false`.
- Captures: `/tmp/pos-qa-cdbc38ee-orders-desktop.png`,
  `/tmp/pos-qa-cdbc38ee-touch-desktop.png`,
  `/tmp/pos-qa-cdbc38ee-orders-mobile.png`,
  `/tmp/pos-qa-cdbc38ee-touch-mobile.png`, and
  `/tmp/pos-qa-cdbc38ee-configs-mobile.png`.
- Visual inspection found the global launcher/icon glyphs rendered at extreme
  sizes and pushing POS content far below the fold. This is an open visual
  parity finding; clean network/error/overflow telemetry does not constitute
  visual sign-off.
- The candidate route contract passes for `view_pos_order`, but a fresh
  browser click-through from an Orders row to the repaired detail route was
  not separately established in this event.

Detailed execution matrix: [`test-plans/point-of-sale.md`](test-plans/point-of-sale.md). It is the module-level source for the remaining route, CRUD, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| POINT_OF_SALE-001 | POS focused contract corpus | 84 tests / 700 assertions across 24 files; 0 failures | PASS |
| POINT_OF_SALE-002 | Touch route responsive render | Authenticated `/point-of-sale/touch` rendered at 1440x900 and 390x844 with House coffee, no page/request errors, HTTP failures, or overflow | PASS |
| POINT_OF_SALE-003 | Cashier persistence and payment guards | Opening cash persisted; product add recalculated 7.70; overpayment 400; Cash payment persisted Paid 7.70 | PASS |
| POINT_OF_SALE-004 | Permission boundary | Fleet payment attempt returned 403 `pos.write` | PASS |
| POINT_OF_SALE-004A | POS Orders row interaction | Candidate contract resolves `view_pos_order` to `/point-of-sale/order-detail` and preserves the row ID; 13/13, 69 assertions | PASS (contract) |
| POINT_OF_SALE-004B | Authenticated route matrix | 72/72 POS routes loaded on desktop; 0 console/page errors, failed requests, HTTP >=400 responses, or horizontal overflow | PASS (route smoke) |
| POINT_OF_SALE-005 | Complete route interaction and fresh paired Odoo comparison | Existing module captures are recorded, but current-wave full route interaction and paired adjudication are incomplete | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| POINT_OF_SALE-BROWSER-001 | Initial full-route harness reused a page and captured late requests from the previous route | — | Discarded; isolated touch contexts rerun cleanly | closed |
| POINT_OF_SALE-VISUAL-001 | Authenticated desktop/mobile captures show oversized global launcher/icon glyphs and POS content displaced far below the fold | `cdbc38ee` | Captures listed above; visual inspection completed 2026-09-13 | open |

## Sign-off

- Functional: pass for the tested cashier/touch slice and POS Orders row route contract
- Permissions: pass for the tested write boundary
- Persistence/data integrity: pass for the tested session/order/payment flow
- Desktop/mobile visual parity: **fail/open** for `POINT_OF_SALE-VISUAL-001`; module parity pending
- Tester decision: conditional; broader route and paired Odoo gates remain open
