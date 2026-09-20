# INV-STOCK-LOCATIONS-001 source comparison

Date: 2026-09-21

## Odoo source/menu/action

- The Stock report list defines `History`, `Replenishment`, `Locations`, and
  `Forecast` row actions in
  `/home/nhanjs/projects/odoo/addons/stock/views/product_views.xml:585-592`.
  `Locations` invokes `%(action_view_quants)d`, passes
  `search_default_product_id` / `default_product_id`, is hidden for zero
  on-hand products, and is restricted to `stock.group_stock_multi_locations`.
- `stock.action_view_quants` is the `stock-locations` server action in
  `addons/stock/views/stock_quant_views.xml:213-224`; it enables the internal
  location filter and delegates to the quant action.
- `stock.quant.action_view_quants` sets the internal-location context and
  returns the quant action in `addons/stock/models/stock_quant.py:395-399`.

## Core3 mapping

`pages/stock-report.yaml` remains presentation-only and joins
`api/stock-report.yaml` by `page.id`; its Locations row action passes the
stock-report product ID to `/stock-report/locations`. The new paired
`stock-locations` page/API exposes product context, internal/transit quant
rows with location/lot/reservation/value fields, durable report-open history,
and a Refresh Locations action. It uses the existing durable
`inventory_quants` / `inventory_locations` data and does not duplicate general
Locations CRUD or quant relocation.

Migration `20260921140000-040-inventory-stock-locations.yaml` adds an
idempotent report-run ledger and a deterministic opening run. Refresh is
permissioned by `inventory.read` and guards current company, actor, non-empty
locations, and product row version.
