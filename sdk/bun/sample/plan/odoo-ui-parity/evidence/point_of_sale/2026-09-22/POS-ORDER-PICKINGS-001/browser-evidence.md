# POS-ORDER-PICKINGS-001 browser evidence

Date: 2026-09-22
Reference: `http://localhost:8069`, authenticated `core3_reference`, browser instance `245ea108`

## Odoo reference

The authenticated Point of Sale Orders form was opened for `Furniture Shop - 000004`.
The source-backed form showed `Invoice` and `Return Products`, but no `Pickings`
smart button. This is consistent with the Odoo source guard
`invisible="picking_count == 0"`: the demo order has no linked picking, so the
filtered `stock.action_picking_tree_ready` list cannot be exercised without
mutating the shared reference data.

- Desktop, 1916x833: `/tmp/core3-odoo-parity-pos-order-pickings-odoo-desktop.png`
- Mobile, 390x844: `/tmp/core3-odoo-parity-pos-order-pickings-odoo-mobile.png`
- Source: `/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_order.py`, `action_stock_picking`
- View: `/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_order_view.xml`, `Pickings` smart button

## Core3 verification

No authenticated Core3 desktop/mobile capture is claimed. The attempted
`bun run dev --db=ddb --memory` startup reached Vite on port 3002, but the
backend exited before `http://127.0.0.1:3001/api/modules` was available. This
prevents an honest browser proof of the new order-detail action and list.

The service-level evidence is the focused test suite:

- `sdk/bun/sample/test/pos_order_pickings.integration.test.ts`
- 3 tests, 15 assertions passed
- durable migration replay and file-backed restart passed
- cross-company and no-picking query boundaries passed

Screenshots are local evidence only and are not committed.
