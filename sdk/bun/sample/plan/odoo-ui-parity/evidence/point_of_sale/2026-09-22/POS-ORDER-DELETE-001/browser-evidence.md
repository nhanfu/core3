# POS-ORDER-DELETE-001 browser evidence

Date: 2026-09-22

## Source and live reference

- Local Odoo source: `/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml` and `/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_order.py`.
- Authenticated Odoo at `http://localhost:8069`, database `core3_reference`:
  Point of Sale > Orders > an order detail was inspected. The form showed
  Invoice, Return Products, Posted/Paid/New status, and Actions > Delete plus
  Cancel Order.
- The live module exists. No Odoo absence blocker applies.

## Core3 authenticated captures

- Desktop: `/tmp/core3-odoo-parity/pos-order-delete-20260922/core3-order-delete-desktop.png`
- Mobile emulation: `/tmp/core3-odoo-parity/pos-order-delete-20260922/core3-order-delete-mobile.png`
- Route: `http://127.0.0.1:3001/point-of-sale/orders`, authenticated with the
  shared local QA session. The seeded `POS/2026/09/22/DELETE-DRAFT` order
  opened with state New and Delete visible. Mobile emulation rendered the
  same action in the narrow viewport.

## Verification and limits

- The isolated POS runtime was used because the mixed-module runtime fails
  startup on duplicate `time_off.requests.refuse`; the Vite proxy also
  returned an initial `/api/modules` 502. Those blockers are outside POS.
- The browser evidence proves authenticated rendering and action visibility;
  durable mutation and restart behavior are covered by the focused DuckDB
  integration test, not inferred from a screenshot.
- Screenshots are intentionally outside Git; this file is the committed
  evidence index.
