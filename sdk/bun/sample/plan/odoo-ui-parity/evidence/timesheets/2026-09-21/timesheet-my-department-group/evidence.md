# TIMESHEET-MY-DEPARTMENT-GROUP-001 evidence

## Source comparison

- Odoo source: `addons/hr_timesheet/models/hr_timesheet.py:74` defines the stored
  `department_id` relation, and
  `addons/hr_timesheet/views/hr_timesheet_views.xml:226-240` exposes the
  Department search group-by with `context="{'group_by': 'department_id'}"`.
- Core3 keeps `pages/entries.yaml` layout-only and joins it to the API contract
  through `page.id: timesheets`. The API projects deterministic department
  relation data from durable `timesheet_employees` rows.

## Authenticated Odoo evidence

- `odoo-desktop.png`: 1440x900 authenticated My Timesheets list with the search
  panel open; Department is visible under Group By.
- `odoo-desktop-department-grouped.png`: the Department action selected; the
  rendered grouped result is visible as `Department / Management (42)` with
  the source total `127:00`.
- `odoo-mobile.png`: 390x844 authenticated responsive Kanban. The desktop
  search/group-by panel is not exposed in this mobile state, so mobile
  Department grouping parity is not claimed.
- `odoo-results.json` and `odoo-department-grouped.json` preserve the captured
  body text, viewport, and page-error results; both authenticated probes had
  no page errors.

## Core3 blocker

The bounded `bun dev --db=ddb --memory` probe reached Vite/event-mediator
startup but backend `127.0.0.1:3001` never accepted `/api/modules` before the
18-second timeout. The exact readiness output is in `core3-readiness.txt`;
therefore no Core3 desktop/mobile browser sign-off is claimed.

Odoo Print/PDF/action parity remains a separate open blocker. This slice is
not Timesheets module sign-off.
