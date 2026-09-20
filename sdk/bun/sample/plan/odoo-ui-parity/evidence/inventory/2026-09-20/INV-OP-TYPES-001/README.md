# INV-OP-TYPES-001 — Operations Types lifecycle

Bounded Inventory owner evidence captured 2026-09-20.

- Core3 runtime: `http://127.0.0.1:4541`, authenticated as `admin@tms.local`.
- Odoo runtime: `http://127.0.0.1:8069`, authenticated as
  `codex@core3.local`.
- Source: `stock.menu_pickingtype` → `stock.action_picking_type_list` in
  `addons/stock/views/stock_picking_type_views.xml`.
- Core3 artifacts include desktop/mobile list and detail captures, create modal,
  edited detail, reload state, and `core3.json`.
- Odoo artifacts include authenticated desktop/mobile exact blocker captures and
  `odoo.json`: `/odoo/action-426` renders Odoo's generic `Oops!` error before
  the list/form surface loads.

The Odoo blocker is recorded as a comparison boundary; no Odoo parity or
mutation sign-off is claimed.
