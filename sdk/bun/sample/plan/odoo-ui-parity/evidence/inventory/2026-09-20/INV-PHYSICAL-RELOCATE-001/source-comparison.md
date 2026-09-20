# INV-PHYSICAL-RELOCATE-001 source comparison

## Odoo

- Menu/action: `stock.menu_action_inventory_tree` (`res_id=314`) and
  `stock.action_view_quants` (`res_id=506`), resolved through authenticated
  `ir.model.data` JSON-RPC.
- Source list: `addons/stock/views/stock_quant_views.xml:108-117,213-223`.
  The Locations/On Hand quant list exposes the manager-only
  `action_stock_quant_relocate` object action.
- Wizard: `addons/stock/wizard/stock_quant_relocate.py:9-99` and
  `stock_quant_relocate.xml:3-31`. It accepts `dest_location_id` and an
  optional relocation message; destinations are active internal locations.
- Model behavior: `addons/stock/models/stock_quant.py:452-466,1545-1557`.
  Odoo rejects non-positive/multi-company selections, moves the full quant,
  and records the default move message as `Quantity Relocated`.

Authenticated Odoo captures are `odoo-desktop-on-hand.png` and
`odoo-mobile-on-hand.png`. The action redirects to `/odoo/stock-locations` and
the source list is visible at both viewports. No Odoo mutation was performed.

## Core3

- `services/inventory/pages/stock.yaml` is layout-only and uses `page.id: stock`.
- `services/inventory/api/stock.yaml` owns the `inventory_stock` source, active
  internal destination catalog, manager-only `relocate_inventory_quant` form,
  and read-only relocation audit source.
- Migration `20260920250000-028-inventory-quant-relocation.yaml` adds durable
  `inventory_quant_relocations` and a deterministic opening audit fixture.
- The mutation updates the quant with row-version concurrency, inserts an audit
  row and `inventory_move_lines` row atomically, preserves lot metadata, and
  rejects stale, same-location, non-internal, and same-product conflicts.

Core3 captures are `core3-desktop-on-hand.png`,
`core3-desktop-relocate-modal.png`, `core3-desktop-relocate-complete.png`, and
`core3-mobile-on-hand.png`. `core3.json` records the authenticated user,
routes, viewport checks, and browser failures.
