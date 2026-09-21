# Wave 35 Odoo comparison

Source comparison:

- `/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml`
  defines `timesheet_action_project` with domain
  `('project_id', 'in', active_ids)` and context `is_timesheet: 1`.
- Core3 maps that behavior to the existing `project-timesheets` page/API pair,
  with durable comma-separated `project_ids` scope and current-company project
  guards.

Authenticated Odoo desktop/mobile comparison was blocked. Both bounded probes
returned HTTP 200 for the unauthenticated login surface only:

- `http://127.0.0.1:8069/web/login` -> final URL `/web/login`.
- `http://127.0.0.1:8073/web/login` -> final URL `/web/login`.

No authenticated Odoo multi-project action state or screenshot is claimed.
Existing Odoo Print/PDF/action surfaces remain blockers, and this slice does
not sign off the Timesheets module.
