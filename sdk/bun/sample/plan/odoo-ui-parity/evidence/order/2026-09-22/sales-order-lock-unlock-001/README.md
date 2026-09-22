# SALES-ORDER-LOCK-UNLOCK-001

Bounded Sales parity slice for Odoo `sale.order.action_lock` and
`sale.order.action_unlock`.

## Source contract

- Odoo source: `addons/sale/models/sale_order.py` defines `locked`,
  `action_lock`, and `action_unlock`.
- Odoo view: `addons/sale/views/sale_order_views.xml` exposes manager-only
  `Lock` and `Unlock` header buttons and prevents cancellation/editing while
  locked.

## Core3 implementation

- Added manager permission `orders.manage` and Sales order `Lock`/`Unlock`
  header actions.
- Normalized the existing `orders.locked` column to durable `FALSE` defaults in
  migration `0.0.25`.
- Added branch, state, actor, stale-row, missing-order, and idempotent-state
  guards; each transition increments `row_version` and writes Sales activity.
- Exposed the readonly `Locked` field on the Other Information tab.

## Verification

Focused command:

```text
bun test test/sales_order_lock.integration.test.ts test/sales_order_detail.integration.test.ts
```

BrowserSkill was connected, but the shared authenticated Odoo tab was already
borrowed by another session (`vyhe`). The required borrow confirmation did not
occur; no tab was taken over, no independent login or Playwright was used, and
no Odoo/Core3 visual-parity claim is made.
