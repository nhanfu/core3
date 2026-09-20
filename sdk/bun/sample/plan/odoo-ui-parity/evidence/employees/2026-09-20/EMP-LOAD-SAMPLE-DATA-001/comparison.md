# EMP-LOAD-SAMPLE-DATA-001 evidence

Date: 2026-09-20

## Source

Odoo `addons/hr/views/hr_employee_views.xml` registers
`action_hr_employee_load_demo_data` as an `ir.actions.server` action and binds
it to the empty Employees help as “Load sample data.” The action calls
`hr.employee._load_demo_data()` in `addons/hr/models/hr_employee.py`, which
loads `data/scenarios/hr_scenario.xml` and reloads when its demo department
already exists.

## Core3 authenticated evidence

- Admin `admin@tms.local` on `http://127.0.0.1:4043/employees`: desktop and
  mobile empty states expose `Load Sample Data` with no page/request errors.
- Desktop click created three durable current-company employees: Michael
  Williams, Emma Granger, and Simon Jones. A reload and a new authenticated
  mobile session retained all three records.
- Fleet `fleet@tms.local` received HTTP 403 for `employees.read`; the action
  was not exposed. The permission boundary is recorded in
  `core3-fleet-boundary.json`.

Captures: `core3-desktop-empty-before.png`,
`core3-desktop-sample-loaded.png`, `core3-desktop-sample-reloaded.png`,
`core3-mobile-sample-loaded.png`, and the matching JSON/text records.

## Odoo authenticated comparison

Odoo `codex@core3.local` was authenticated at
`http://127.0.0.1:8069/odoo/employees` at 1440x900 and 390x844 with no page
errors or failed requests. Both captures show the Employees list with 24
seeded records. The Odoo empty-state help and its Load Sample Data button are
therefore not rendered in this non-empty company; changing the reference
database to force that state would be a destructive fixture mutation, so the
empty-state comparison is recorded as a precise blocker rather than claimed
as a pass.
