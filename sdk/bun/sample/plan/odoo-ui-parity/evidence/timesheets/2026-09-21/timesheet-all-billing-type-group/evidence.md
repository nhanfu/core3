# `TIMESHEET-ALL-BILLING-TYPE-GROUP-001`

## Source and Core3 contract

Odoo `sale_timesheet` adds the authenticated All Timesheets `Billing Type`
group-by in `addons/sale_timesheet/views/hr_timesheet_views.xml`, using
`context={'group_by': 'timesheet_invoice_type'}` and the Sales user group.

Core3 exposes the bounded group-by on the existing All Timesheets page and
declares the paired API `group_by_contracts` metadata, joined by
`page.id: all-timesheets`. The existing durable `timesheet_entries.billing_type`
projection supplies the grouping state; no duplicate persistence model was
introduced. Manager permission, current-company and empty guards, relation
freshness, and file-backed restart remain covered.

## Verification evidence

- `test/timesheets_all_billing_type_group.integration.test.ts`: 4 tests / 17
  expectations, including source mapping, durable grouping counts,
  permission/company/empty guards, freshness, and restart.
- Bounded All Timesheets regression: 58 tests / 346 expectations.
- Repository UI audit passed: 729 pages, 738 routes, and 1,419 datasources.
- ESLint and `git diff --check` passed.
- Core3 and authenticated Odoo capture blockers are recorded in
  `core3-readiness.txt`, `odoo-blocker.txt`, and `odoo-results.json`.

Odoo Print/PDF/report-action surfaces remain broader Timesheets blockers. This
bounded slice does not claim module sign-off.
