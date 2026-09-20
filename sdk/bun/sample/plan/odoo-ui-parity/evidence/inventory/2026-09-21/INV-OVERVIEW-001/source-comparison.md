# INV-OVERVIEW-001 source comparison

Date: 2026-09-21

## Odoo source

- `addons/stock/views/stock_picking_type_views.xml:16-39` declares
  `stock_picking_type_action` / `stock_picking_type_menu`, path `inventory`,
  model `stock.picking.type`, and `kanban,form` view mode.
- `addons/stock/views/stock_picking_type_views.xml:180-293` declares the
  non-editable operation cards. Each card exposes All, Ready, Waiting, and a
  New/configuration/report menu; visible counters cover Ready, Waiting, Late,
  Back Orders, and Operations.

## Core3 mapping

- `pages/overview.yaml` is presentation-only and exposes the Odoo-style
  kanban/list view, responsive card metrics, and queue form.
- `api/overview.yaml` owns `inventory_overview_cards`, durable
  `inventory_overview_runs`, and `stock.inventory_overview.open`; both
  contracts join through `page.id: inventory-overview`.
- Migration `20260921200000-046-inventory-overview.yaml` adds durable open
  history and a deterministic opening row. Cards aggregate durable operation
  types, pickings, and move lines; the queue form exposes All, Ready, Waiting,
  Late, Back Orders, and Operations.
- Core3 intentionally defers source New, card configuration, and direct
  operation-type reporting navigation to existing operation-type/report
  surfaces; this slice covers overview counters and queue context.

## Evidence index

- Core3 authenticated desktop/mobile: `core3-browser.json`,
  `desktop-overview.png`, `mobile-overview.png`,
  `desktop-open-queue.png`, and `mobile-open-queue.png`.
- Odoo authenticated desktop/mobile route: `odoo-inventory-route.json`,
  `odoo-desktop-inventory-route.png`, and
  `odoo-mobile-inventory-route.png`.
- Odoo reached `/odoo/inventory` in both viewports and rendered Receipts,
  Delivery Orders, and PoS Orders operation cards. No Odoo mutation was
  attempted.
