# INV-ROUTES-001 source comparison

Odoo source:

- `addons/stock/views/stock_location_views.xml:174-268` defines the Routes
  list, form, search view, `action_routes_form`, and `menu_routes_config`.
- `addons/stock/models/stock_location.py:518-580` defines `stock.route` and
  its company, warehouse, applicability, and rule relationships.
- The source menu is under Inventory > Configuration > Warehouse Management
  and requires `stock.group_adv_location`.

Core3 mapping:

- `pages/routes.yaml` + `api/routes.yaml`, joined by `page.id: routes`, provide
  the list, filters, New action, and manager-gated create action.
- `pages/route-detail.yaml` + `api/route-detail.yaml`, joined by
  `page.id: route-detail`, provide fields, related rules, edit, archive/restore,
  and guarded delete.
- Migration `20260921170000-043-inventory-routes.yaml` persists deterministic
  routes and rules. The API carries current-company, actor, and row-version
  checks.

The Core3 contract is source-backed for the reachable Routes workflow. Direct
Odoo form comparison is blocked at the source menu permission, not by an
untested Core3 path.
