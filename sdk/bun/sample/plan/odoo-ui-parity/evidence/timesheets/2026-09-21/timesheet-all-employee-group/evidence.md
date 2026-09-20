# `TIMESHEET-ALL-EMPLOYEE-GROUP-001`

## Source and implementation

- Odoo `hr_timesheet` defines the authenticated `timesheet_action_all` action and
  `groupby_employee` search filter (`context={'group_by': 'employee_id'}`).
- Core3 keeps the page contract in `services/timesheets/pages/all-timesheets.yaml`
  and the API contract in `services/timesheets/api/all-timesheets.yaml`, joined by
  `page.id: all-timesheets`.
- The API now projects durable `employee_id` into the list and pivot data; the page
  exposes Employee ID in the pivot and as an optional list column. Existing durable
  `timesheet_entries.employee_id` data is exercised across restart.

## Browser evidence

- `odoo-desktop.png`: authenticated Odoo All Timesheets with Employee grouping applied;
  the grouped result renders 23 employee groups and a `991:00` total.
- `odoo-mobile.png`: authenticated responsive Odoo All Timesheets Kanban at mobile width;
  the desktop search/group-by control is not exposed at this viewport.
- `odoo-results.json`: authenticated route, grouping, viewport, and console-error capture.
- Core3 desktop/mobile evidence is blocked before authentication by the unrelated shared
  `discoverPages` schema failure recorded in `core3-readiness.txt`.

Odoo Print/PDF/action surfaces remain broader blockers; this bounded slice is not module
sign-off.
