# Verification

Date: 2026-09-22. Browser instance: `245ea108`. The bsk session was stopped
after the bounded reference and blocker checks.

## Odoo reference

Authenticated `http://localhost:8069`, database `core3_reference`, was checked
at the desktop viewport exposed by the existing browser window. The live flow
was exercised through Orders → Furniture Shop - 000004 → Return Products:

- source order showed `1 Refunds`;
- refund draft showed `Furniture Shop - 000004 Refunded Orders`;
- `Refunds` opened a one-row `Refund Orders` list with the negative draft;
- the temporary refund was deleted through Odoo's confirmation dialog, restoring
  the original four-order reference state.

Captures:

- `/tmp/core3-odoo-parity/pos-order-refund-links-20260922/odoo-source-with-refunds.png`
- `/tmp/core3-odoo-parity/pos-order-refund-links-20260922/odoo-refund-order.png`
- `/tmp/core3-odoo-parity/pos-order-refund-links-20260922/odoo-refund-orders-list.png`

The live reference did not provide an independent mobile capture in this bsk
window; no mobile Odoo parity claim is made.

## Core3

The POS-only runtime was healthy: `GET http://127.0.0.1:3413/api/modules`
returned 200 and included `/point-of-sale/refund-orders`. The task-created bsk
tab had no authenticated Core3 session and rendered the Core3 sign-in boundary
instead of the protected page. The available user tabs contained Odoo and
ChatGPT only; no local QA Core3 tab/session was available to borrow.

Observed boundary: `GET http://127.0.0.1:3413/api/auth/me` returned 401.
The unauthenticated capture is:

- `/tmp/core3-odoo-parity/pos-order-refund-links-20260922/core3-unauthenticated-sign-in.png`

Therefore no authenticated Core3 desktop/mobile screenshot, click-through,
responsive assertion, or visual-parity claim is made. The service-backed
desktop/mobile Core3 gate is blocked specifically by the missing reusable QA
login session, not by route discovery or the focused contract tests.
