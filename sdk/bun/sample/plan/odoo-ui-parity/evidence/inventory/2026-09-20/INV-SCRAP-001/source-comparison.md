# Source comparison

| Odoo behavior | Core3 contract/evidence | Result |
| --- | --- | --- |
| `stock.action_stock_scrap` list/form/kanban/pivot/graph | `pages/scraps.yaml` list views and `api/scraps.yaml` datasource/actions joined by `page.id: inventory-scraps` | covered |
| Draft/Done status and Validate | `pages/scrap-detail.yaml` statusbar/header; `api/scrap-detail.yaml` `validate_inventory_scrap` | covered |
| Validate creates/completes a stock move and move line | migration `0.0.25` and validation step persist one `inventory_scrap_moves` row with Done/date/origin/location/quantity | covered |
| Product Moves stat/detail relation | read-only `inventory_scrap_moves` datasource and detail `LineItemGrid` | covered |
| Done rows cannot be deleted or edited | existing guarded update/delete mutations and focused tests | covered |
| Product/lot/package/owner/replenishment/source fields | Scrap create/edit fields and deterministic migration fixtures | bounded fields covered |
| Odoo Stock Operation stat and actual replenishment procurement | Core3 retains picking/origin/replenish fields but does not implement a Stock Operation stat or procurement callback in this slice | residual |
| Odoo chatter and reason tags | Core3 notes/reason-adjacent fields remain form data; mail.thread/reason-tag behavior is outside this bounded slice | residual |
