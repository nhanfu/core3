# Source comparison

| Concern | Odoo source | Core3 implementation |
| --- | --- | --- |
| Stored field | `addons/hr/models/hr_employee.py`: `hr.employee.pin`, optional digit-only Char field | `employees.pin`, migration `20260921220000-052` with deterministic fixtures |
| Form surface | `addons/hr/views/hr_employee_views.xml`: Settings → Attendance/Point of Sale → `PIN Code` | `pages/employee-detail.yaml`: Settings group, read-only projection, dedicated `Edit PIN Code` header action |
| API/action | HR-user employee write access; PIN validation requires digits | `api/employee-detail.yaml`: `edit_employee_pin`, `employees.write`, actor/company/active/stale/digits guards |
| Create | Odoo employee form accepts an optional PIN | `api/employees.yaml` accepts `pin`; sample-load fixtures set deterministic values |

The barcode Generate/Print Badge workflows remain separate and are not folded
into this PIN slice. Page YAML and API/action YAML join at `page.id:
employee-detail`.
