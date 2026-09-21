# TIMESHEET-PORTAL-VISIBILITY-DOMAIN-001

## Odoo reference

- URL: `http://localhost:8069`
- Database: `core3_reference`
- Route compared: `http://localhost:8069/my/timesheets?db=core3_reference`
- Authenticated account label observed in the browser: `Codex QA 2`
- Source: `addons/hr_timesheet/models/hr_timesheet.py`,
  `_timesheet_get_portal_domain`
- Controller: `addons/hr_timesheet/controllers/portal.py`, `/my/timesheets`

The Odoo source combines the current partner's `message_partner_ids` or
`partner_id` relation with project privacy `invited_users` or `portal`. The
Core3 API keeps `pages/portal-timesheets.yaml` layout-only and joins its
separate `api/portal-timesheets.yaml` contract by `page.id:
timesheets-portal`. The durable query models project privacy, active portal
relation rows, current company, current actor, optional project selection, and
expected project version. A left relation join preserves the existing
internal employee-owned branch while portal users fail closed without an
active relation or allowed privacy.

The paired reference exposed a populated Timesheets list with project,
employee, task, description, invoice, and time-spent columns. Odoo's Print,
PDF, and action surfaces were not visible on this portal list and remain
explicit parity blockers.
