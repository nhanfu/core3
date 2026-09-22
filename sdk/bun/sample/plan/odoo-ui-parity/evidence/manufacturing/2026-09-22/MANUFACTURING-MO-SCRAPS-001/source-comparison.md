# Source comparison

| Odoo source | Existing Core3 before this slice | Change |
| --- | --- | --- |
| `addons/mrp/models/mrp_production.py`, `action_see_move_scrap` | MO detail had no Scraps stat launcher; global Scrap Orders were not durably scoped by MO | Add the MO-scoped launcher and query/action contract |
| `addons/stock/views/stock_scrap_views.xml`, `stock.action_stock_scrap` | Global `/scraps` exposed the shared list/detail surface | Add a page-id-bound scoped page with the same five source modes |
| `stock.scrap.production_id` relation | Fixture rows only retained `production_name` text | Migration `20260922170000-026-production-scraps-index.yaml` adds and backfills `production_id` plus an index |

The scoped query joins the selected durable MO and enforces the MO company
boundary. Existing Scrap Orders CRUD/validation actions remain the mutation
boundary; the scoped create/delete actions add the selected MO guard and reuse
the same table and row-version checks.
