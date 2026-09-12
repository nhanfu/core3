# point-of-sale parity progress

Module owner: point-of-sale module owner
QA assignment: QA-2
Status: in-progress
Verification trigger: feature-complete
Candidate commit: `cdbc38ee`

## Current state

The module has a current functional/browser QA candidate. No complete parity
claim is made: the focused corpus and route smoke pass, but visual inspection
found an oversized global launcher/icon rendering defect, while broader route
interaction, empty/error states, actor/restart coverage, and fresh paired Odoo
adjudication remain open.

## QA-2 verification of `cdbc38ee` (2026-09-13)

- POS corpus: 84 passed, 700 assertions, 0 failures across 24 files in 104.67s.
- UI audit: 659 pages, 668 routes, 1,134 datasources; passed.
- Authenticated desktop matrix: 72/72 registered POS routes loaded at
  1440x900 with 0 console/page errors, 0 failed requests, 0 HTTP responses
  >=400, and 0 horizontal overflow.
- Authenticated mobile smoke for touch, orders, and configs at 390x844:
  rendered with `overflow=false`.
- Captures: `/tmp/pos-qa-cdbc38ee-orders-desktop.png`,
  `/tmp/pos-qa-cdbc38ee-touch-desktop.png`,
  `/tmp/pos-qa-cdbc38ee-orders-mobile.png`,
  `/tmp/pos-qa-cdbc38ee-touch-mobile.png`,
  `/tmp/pos-qa-cdbc38ee-configs-mobile.png`.
- Open finding `POINT_OF_SALE-VISUAL-001`: global launcher/icon glyphs render
  at extreme sizes and push POS content far below the fold. The candidate is
  not visually signed off.

## QA decision

Conditional: functional/route smoke passes, but visual sign-off is blocked by
`POINT_OF_SALE-VISUAL-001`. Fresh browser click-through, actor/restart,
empty/error, and paired Odoo gates are still required.

## Current evidence (2026-09-12)

- POS focused corpus: `bun test ./test/pos*.integration.test.ts --timeout 20000` — 84 passed, 700 assertions, 0 failed across 24 files.
- Fresh authenticated touch-selling captures on port 4028 passed at desktop
  1440x900 and mobile 390x844. Both rendered the active session and House
  coffee product with no page errors, failed requests, HTTP failures, or
  horizontal overflow. Captures: `/tmp/core3-pos-touch-current-desktop.png`
  and `/tmp/core3-pos-touch-current-mobile.png`.
- Fresh authenticated cashier mutations passed: opening control persisted
  counted cash; adding House coffee recalculated the ticket to 7.70;
  overpayment returned 400; Cash payment persisted Paid/7.70; Fleet was
  denied `pos.write` with 403.
- DEV-3 route interaction repair: POS Orders `view_pos_order` now navigates to
  the registered POS detail route `/point-of-sale/order-detail` instead of the
  generic Orders route `/order-detail`. The focused parity file passes 13/13
  tests and 69 assertions; `bun run audit` passes with 659 pages, 668 routes,
  and 1,134 datasources.

## Next bounded task

Complete the remaining POS empty/error coverage and route interactions, then
run fresh paired Odoo/Core3 comparisons for the accepted cashier,
configuration, and reporting surfaces before sign-off.
