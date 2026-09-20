# `TIMESHEET-ALL-CALENDAR-MULTI-CREATE-001`

## Source and implementation

- Odoo binds `timesheet_action_all` to `timesheet_action_view_all_calendar`, whose
  calendar uses `multi_create_view="hr_timesheet.view_calendar_account_analytic_line_multi_create"`.
- Core3 keeps `services/timesheets/pages/all-timesheets.yaml` layout-only and
  `services/timesheets/api/all-timesheets.yaml` action/data-only, joined by
  `page.id: all-timesheets`.
- The manager-only action selects an active employee and writes a durable
  `timesheet_entry_batches` record plus one durable `timesheet_entries` row per day.
  The existing calendar migration/table is reused; no duplicate persistence model was added.

## Browser evidence

- `odoo-desktop.png`: authenticated All Timesheets calendar at 1440x900, with
  month cells and persisted calendar activities rendered; no page errors.
- `odoo-mobile.png`: authenticated responsive All Timesheets Kanban at 390x844;
  no page errors.
- `odoo-results.json`: authenticated route, viewport, calendar/card counts, and
  console-error capture. The desktop runtime did not expose a standard New/Create
  button in the calendar toolbar, so the multi-create dialog itself is not claimed.
- Core3 desktop/mobile capture is blocked before authentication by the shared page
  schema error recorded in `core3-readiness.txt`.

Odoo Print/PDF/action surfaces remain broader blockers; this bounded slice is not
module sign-off.
