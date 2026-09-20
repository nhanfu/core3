# TIMESHEET-MY-MANAGER-GROUP-001 evidence

## Source comparison

- Odoo source: `addons/hr_timesheet/models/hr_timesheet.py:75` defines the
  stored related `manager_id` from `employee_id.parent_id`, and
  `addons/hr_timesheet/views/hr_timesheet_views.xml:226-240` exposes the
  Manager search group-by with `context="{'group_by': 'manager_id'}"`.
- Core3 keeps `pages/entries.yaml` layout-only and joins it to the API
  contract through `page.id: timesheets`. The API projects deterministic
  manager relation data from durable `timesheet_employees` rows.

## Authenticated Odoo evidence

- `odoo-desktop.png`: 1440x900 authenticated My Timesheets list with Manager
  applied through Group By; the rendered grouped result is `Mitchell Admin
  (42)` with the source total `127:00`.
- `odoo-mobile.png`: 390x844 authenticated responsive Kanban. The desktop
  search/group-by control is not exposed in this mobile state, so mobile
  Manager grouping parity is not claimed.
- `odoo-results.json` preserves captured body text, viewport, grouping state,
  and page-error results; the authenticated probes had no page errors.

## Core3 blocker

The bounded `bun dev --db=ddb --memory` probe reached Vite/event-mediator
startup but `discoverPages` failed on an unrelated page schema using
`actions[2].fields[*].max_length`, which is not allowed. Backend
`127.0.0.1:3001` therefore never accepted `/api/modules`; the exact output is
in `core3-readiness.txt`. No other owner file was repaired or staged, and no
Core3 desktop/mobile browser sign-off is claimed.

Odoo Print/PDF/action parity remains a separate open blocker. This slice is
not Timesheets module sign-off.
