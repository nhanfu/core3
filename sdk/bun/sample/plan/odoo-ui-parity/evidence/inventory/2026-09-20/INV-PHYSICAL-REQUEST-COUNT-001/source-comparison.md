# INV-PHYSICAL-REQUEST-COUNT-001 source comparison

## Odoo source

- Menu/action: `stock.menu_action_inventory_tree` (`res_id=314`) invokes
  `stock.action_view_inventory_tree` (`res_id=505`). The editable Physical
  Inventory list declares manager-only Request a Count at
  `addons/stock/views/stock_quant_views.xml:278-321`.
- Wizard action: `stock.action_stock_request_count` (`res_id=492`) opens the
  `stock.request.count` form from `addons/stock/wizard/stock_request_count.xml:3-32`.
- Fields: Scheduled at (`inventory_date`), Assign to (`user_id`), and Show
  expected quantity (`show_expected_quantity`). Confirm calls
  `action_request_count`; `stock_request_count.py:31-54` writes the scheduled
  date and optional user to selected quants. It does not apply counted stock.

Authenticated Odoo captures are `odoo-desktop-physical-inventory.png` and
`odoo-mobile-physical-inventory.png`. The supplied authenticated user renders
the source list with no request failures or overflow, but the Request a Count
button is absent because the user is not in Odoo's manager group. This is the
exact comparison blocker; no Odoo mutation was performed.

## Core3 implementation

- `services/inventory/pages/physical-inventory.yaml` remains presentation-only,
  with selectable rows and the `inventory.manage` bulk-action declaration.
- `services/inventory/api/physical-inventory.yaml` owns the assignee catalog,
  durable request datasource, and `request_inventory_count` server form.
- Migration `20260920260000-029-inventory-count-requests.yaml` adds request
  headers/selected-quant lines and deterministic seed data.
- The mutation updates selected active internal/transit quants atomically,
  creates request audit rows, validates date/user/selection, rolls back invalid
  selections, and survives restart.

Core3 captures are `core3-desktop-before.png`,
`core3-desktop-request-modal.png`, `core3-desktop-request-complete.png`, and
`core3-mobile-physical-inventory.png`; `core3.json` records authenticated
desktop/mobile route and viewport checks.
