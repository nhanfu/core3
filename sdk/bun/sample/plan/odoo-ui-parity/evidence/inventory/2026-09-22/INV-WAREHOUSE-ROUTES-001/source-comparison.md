# INV-WAREHOUSE-ROUTES-001 source comparison

## Odoo 19

- `addons/stock/views/stock_warehouse_views.xml:11-20` renders the Warehouse
  form `Routes` stat button and calls `action_view_all_routes`.
- `addons/stock/models/stock_warehouse.py:1150-1161` computes the selected
  warehouse's routes from configured routes, its MTO rule route, and routes
  supplied by the warehouse. The returned window action opens `stock.route`
  in list/form mode with `default_warehouse_selectable` and
  `default_warehouse_ids` context.
- `addons/stock/views/stock_location_views.xml:251-268` defines the shared
  Routes list/form action and its advanced-location configuration menu.

## Core3 implementation

- `pages/warehouse-detail.yaml` adds a manager-only `Routes` stat button with
  the deterministic `route_count` value.
- `api/warehouse-detail.yaml` adds `view_inventory_warehouse_routes`, passing
  the warehouse ID and company to the existing `/routes` page. The detail
  datasource counts direct and route-rule warehouse links, including archived
  routes, matching the source action's `active_test=False` route lookup.
- `api/routes.yaml` applies `warehouse_id` to both direct route ownership and
  warehouse-linked route rules while retaining company, status, search, empty,
  and transport boundaries. No duplicate route page or renderer was added.

The Core3 contract is intentionally scoped to the existing durable route
model. The source's many-to-many route relation and MTO relation are
represented by the current route/rule warehouse links; no unsupported data
model was fabricated.
