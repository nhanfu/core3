# `TIMESHEET-ALL-EMPLOYEE-FILTER-001`

## Source comparison

Odoo's `hr_timesheet_line_search` defines the structured `employee_id` search field, and the `timesheet_action_all` action opens the All Timesheets surface. The authenticated Odoo capture applies that filter to `Mitchell`; the desktop result reports `1-42 / 42` and all visible rows are Mitchell Admin. The mobile capture records the responsive Kanban state.

## Core3 implementation

`services/timesheets/pages/all-timesheets.yaml` and `services/timesheets/api/all-timesheets.yaml` remain separate and join through `page.id: all-timesheets`. The page declares the Employee filter and the API declares the manager-scoped `all_timesheet_employees` options datasource plus the employee predicate. The relation is durable through `timesheet_entries.employee_id`; no duplicate migration was required. The query preserves active-company and empty-fixture guards.

Focused coverage is `test/timesheets_all_employee_filter.integration.test.ts`: page/API/source mapping, employee/company/empty guards, manager permission, and file-backed restart are covered by 3 tests / 18 expectations.

## Evidence and blockers

- Odoo desktop: `odoo-desktop.png`; authenticated Employee filter applied to Mitchell with no browser errors.
- Odoo mobile: `odoo-mobile.png`; authenticated responsive Kanban with no browser errors.
- Odoo runtime results: `odoo-results.json`.
- Core3 desktop/mobile capture is blocked before authentication: the bounded 18-second startup probe printed Vite readiness but backend `3001/api/modules` remained unavailable; exact output is in `core3-readiness.txt`.
- Odoo Print/PDF/action surfaces remain unexposed blockers. This slice is not module sign-off.
