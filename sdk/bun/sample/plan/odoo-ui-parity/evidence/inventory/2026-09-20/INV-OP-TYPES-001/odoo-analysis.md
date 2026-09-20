# Odoo analysis

- Menu: Inventory > Configuration > Operations Types.
- Menu XML ID: `stock.menu_pickingtype`.
- Window action: `stock.action_picking_type_list`.
- Model: `stock.picking.type`.
- Source: `/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_type_views.xml`.
- Source view order: `list,form`; source list search includes Favorites,
  Archived, Type of Operation, and Warehouse groupings.
- Source form sections: General and Hardware, with reservation/backorder/move
  policy, lot/serial, packages, source/destination locations, and auto-print
  controls.

Authenticated comparison with `codex@core3.local` succeeded at login, but the
reference action URL `/odoo/action-426` rendered Odoo's generic `Oops!` error
at desktop and mobile before the source list/form could load. The exact JSON
and screenshots are retained in this directory; this is a blocker, not a
visual parity claim.
