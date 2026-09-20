# INV-LOT-TRACEABILITY-001 source comparison

## Odoo source

- Lot form `addons/stock/views/stock_lot_views.xml:8-28` exposes the
  `Traceability` stat button, invoking client action `stock.action_stock_report`.
- `addons/stock/data/stock_traceability_report_data.xml:4-8` binds that action
  to `stock_report_generic` and the authenticated controller
  `/stock/<output_format>/<report_name>`. The PDF path uses
  `stock.traceability.report`, active lot/picking context, and renders the
  source-backed columns Reference, Product, Date, Lot/Serial #, From, To, and
  Quantity (`report_stock_traceability.xml:20-38`).

The supplied authenticated Odoo user renders `/odoo/lots` at desktop and
mobile widths, but the list capture does not expose a selected lot form or the
Traceability stat button. Mobile also reports two asset request failures. This
is the exact paired-Odoo blocker; no Odoo mutation was performed.

## Core3 implementation

- `pages/lot-detail.yaml` remains presentation-only and adds the permissioned
  Traceability navigation action; `pages/lot-traceability.yaml` is layout-only.
- `api/lot-detail.yaml` and `api/lot-traceability.yaml` own the route binding,
  company-scoped context/line/history datasources, client Print action, and
  server report-run mutation. The client action calls the fixed YAML action and
  invokes the browser print surface; it does not accept arbitrary report paths.
- Migration `20260920280000-031-inventory-lot-traceability.yaml` adds durable
  report runs plus deterministic lot and completed move-line fixtures.

Authenticated Core3 desktop/mobile report captures and JSON checks are in this
directory; both final routes had empty request/page-error arrays and no
horizontal overflow.
