# EMP-WORKING-HOURS-001 evidence

This slice covers Odoo's employee-specific `resource_calendar_id` / Working
Hours assignment on `hr.employee` and `hr.version`. Core3 persists the selected
working-schedule relation on the employee and active Payroll version, exposes a
manager-gated action, and keeps the employee detail page YAML separate from the
API/action YAML.

The Odoo captures below are authenticated desktop/mobile reference evidence.
Core3 runtime evidence is recorded in `verification.md`; if the bounded sample
runtime does not bind its backend port, that is an explicit blocker rather than
a parity sign-off.
