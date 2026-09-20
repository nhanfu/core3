# INV-PHYSICAL-RESET-001 source comparison

## Odoo source

- Menu/action: `stock.menu_action_inventory_tree` (`res_id=314`) invokes
  `stock.action_view_inventory_tree` (`res_id=505`). The editable Physical
  Inventory list declares manager-only `Clear` (`action_reset`) alongside
  Apply All and Request a Count at `addons/stock/views/stock_quant_views.xml:278-321`.
- Warning workflow: `stock.quant.action_reset` at
  `addons/stock/models/stock_quant.py:531-543` opens `stock.inventory.warning`.
  Its Continue action calls `action_clear_inventory_quantity` from
  `addons/stock/wizard/stock_inventory_warning.py:7-14`, setting inventory
  quantity/difference to zero, unsetting the count flag, and clearing the user.
  The warning text is “This will discard all unapplied counts, do you want to proceed?”.

The authenticated Odoo user can render the Physical Inventory list at desktop
and mobile widths, but is not in `stock.group_stock_manager`; the manager-only
Clear control and warning modal are absent. `odoo.json` records this exact
blocker. No Odoo write was performed.

## Core3 implementation

- `pages/physical-inventory.yaml` remains layout-only and declares the manager
  bulk action `reset_inventory_counts`; `api/physical-inventory.yaml` owns the
  action, reset-run datasource, confirmation, company scope, and mutation.
- Migration `20260920270000-030-inventory-count-resets.yaml` adds durable reset
  headers/selected-quant lines and deterministic seed data.
- The mutation clears selected quantities with the source semantics, increments
  row versions, records actor and selected rows, rejects invalid/company/stale
  requests, and survives restart.

Core3 captures include authenticated desktop list, selected-row Clear/Request a
Count controls, and mobile list under this directory. `core3.json` records the
authenticated route, selected ID, 1440/390 viewport widths, and empty final
list page/request errors.
