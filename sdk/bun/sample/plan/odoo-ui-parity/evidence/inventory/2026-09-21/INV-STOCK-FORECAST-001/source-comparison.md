# INV-STOCK-FORECAST-001 source comparison

Date: 2026-09-21

## Odoo source/menu/action

- `stock.menu_product_stock` and `stock.action_product_stock_view` define the
  Inventory Reporting > Stock menu/action in
  `/home/nhanjs/projects/odoo/addons/stock/views/product_views.xml:618-626,663-664`.
- Product kanban exposes `View Availability` as
  `action_product_forecast_report` at `product_views.xml:306-308`; the product
  form exposes the same object action with `default_product_id` context at
  `product_views.xml:319-328`.
- `stock_forecasted_product_product_action` and
  `stock_forecasted_product_template_action` are `Forecasted Report` client
  actions tagged `stock_forecasted` in
  `views/stock_forecasted.xml:4-14`. The object method resolves the product
  client action in `models/product.py:697-700`.

## Core3 mapping

`pages/stock-report.yaml` remains presentation-only and joins
`api/stock-report.yaml` by `page.id`; its Forecast row action passes `row.id`
to the new `stock-forecast` page. The paired page/API owns company-scoped
context, deterministic incoming/outgoing forecast lines, durable report-run
history, and a permissioned Refresh Forecast action. Migration
`20260921130000-039-inventory-stock-forecast.yaml` persists the lines and runs.
Refresh records actor/company/line count and enforces current-company,
authenticated-actor, non-empty, and row-version guards without changing stock
quantities. Detailed stock quant scheduling and the Odoo client renderer remain
open scope.
