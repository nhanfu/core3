# `TIMESHEET-PROJECT-CONTEXT-DEFAULT-001` Odoo comparison

Sources:

- `/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_project.py`
- `/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml`

Odoo's `action_project_timesheets` opens `act_hr_timesheet_line_by_project`.
That action scopes analytic lines to `('project_id', '=', active_id)` and
passes `"default_project_id": active_id` in its form context. Core3 maps this
to the project-timesheets page/API pair: the active route project is resolved
through durable `project_timesheet_entry_defaults` and source-prefilled into
the new-entry mutation.

The live Odoo probe reached only `/web/login` on ports 8069 and 8073; it did
not establish an authenticated project action. There is therefore no
authenticated Odoo desktop/mobile capture or visual parity claim. Odoo
Print/PDF/action surfaces from prior Timesheets slices remain separate known
blockers.
