# Source comparison

| Surface | Odoo source | Core3 implementation | Evidence |
| --- | --- | --- | --- |
| Employee relation | `addons/hr/models/hr_employee.py` defines `coach_id` as a Many2one employee relation | `employees.coach_name` is durable, migration-backed, and current-company guarded | `employees_coach.integration.test.ts` |
| Search/list | `hr_employee_views.xml` adds `coach_id` to employee search and as an optional list column | Employees API selects/searches `coach_name`; page provides Coach filter and list column | `core3-desktop.png`, `odoo-desktop.png` |
| Write path | Odoo model relation is editable in the employee model | Dedicated `edit_employee_coach` server-form action validates actor, company, active coach, and row version | focused CRUD/permission/restart test |
| Responsive surface | Odoo Employees route is authenticated at desktop/mobile sizes | Core3 Employees route is authenticated at desktop/mobile sizes | four PNG captures |

The Odoo Coach list column is hidden in the default view, so its label is not
visible in the default authenticated capture. Core3's authenticated session
has a different company from its deterministic fixtures, so its list has no
rows. Those are runtime/reference-data blockers, not sign-off.
