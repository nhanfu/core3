# `TIMESHEET-SALES-ORDER-ITEM-ACTION-001`

## Source and Core3 contract

Odoo `sale_timesheet` defines `timesheet_action_from_sales_order_item` in
`addons/sale_timesheet/views/hr_timesheet_views.xml`. Its domain scopes
analytic lines to `so_line = active_id`, and its context enables the billable
timesheet and current-week defaults while retaining the active sales-order
line for new entries.

Core3 adds the paired `sales-order-item-timesheets` page/API contract joined
by `page.id`. The page is reached from the existing All Timesheets row action
when a durable `sales_order_item` relation is present. The API reads the same
durable `timesheet_entries.sales_order_item`, applies the source billable and
current-week context, and retains manager permission, company, empty, missing
relation, freshness, and restart guards. No duplicate persistence table was
introduced.

## Verification evidence

- `test/timesheets_sales_order_item_action.integration.test.ts`: 4 tests / 22
  expectations, including source mapping, page/API separation, durable scoped
  reads, current-week and billable context, company/empty/missing-item guards,
  relation freshness, and file-backed restart.
- Repository UI audit passed: 729 pages, 738 routes, and 1,419 datasources.
- Authenticated Core3 capture was attempted; the backend listener disappeared
  during the bounded readiness probe. Exact output is in `core3-readiness.txt`.
- Authenticated Odoo capture was attempted; exact database/listener failures
  are in `odoo-blocker.txt` and `odoo-results.json`. No screenshot is claimed.

Odoo Print/PDF/report-action surfaces remain broader Timesheets blockers. This
bounded slice does not claim module sign-off.
