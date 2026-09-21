# `TIMESHEET-EMPLOYEE-CONTEXT-DEFAULT-001` Odoo comparison

Source: `/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml`

Odoo's `timesheet_action_from_employee` is an `account.analytic.line`
window action whose domain is scoped to `('employee_id', '=', active_id)` and
whose context includes `default_employee_id: active_id`. The Core3 mapping is
the employee-timesheets page/API pair: the active route employee is resolved
through the durable `employee_timesheet_entry_defaults` datasource and is
source-prefilled into the new-entry mutation.

The paired live Odoo probe reached only `/web/login` on ports 8069 and 8073;
it did not establish an authenticated employee record action. Consequently
there is no authenticated Odoo desktop/mobile capture or visual parity claim.
Odoo Print/PDF/action surfaces from prior Timesheets slices remain separate
known blockers.
