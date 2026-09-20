# Source comparison

| Odoo source | Core3 implementation |
| --- | --- |
| `addons/hr/models/hr_version.py`: `marital`, `spouse_complete_name`, `spouse_birthdate`, `children` | Migration `20260920250000-036-employee-family.yaml` adds durable current-employee fields and deterministic values |
| `addons/hr/views/hr_employee_views.xml`: Family group and spouse visibility when marital is married/cohabitant | `services/employees/pages/employee-detail.yaml` adds Family fields with conditional spouse display |
| Odoo HR-user form save and selection/date/integer fields | `employee-detail.yaml` and `employees.yaml` expose create/edit/read CRUD with employees.read/write, current-company, row-version, status, date, and count guards |

Core3 stores the current employee-facing values on the durable employee record;
employee history remains owned by the existing Employee Records surface.
