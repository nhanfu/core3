# Source comparison

| Odoo source | Core3 implementation |
| --- | --- |
| `addons/hr/models/hr_employee.py`: `emergency_contact`, `emergency_phone` | Migration `20260920240000-035-employee-emergency-contact.yaml` adds durable columns and deterministic rows |
| `addons/hr/views/hr_employee_views.xml`: Personal > Emergency Contact group, Contact and Phone fields | `services/employees/pages/employee-detail.yaml` adds the Personal group; `api/employee-detail.yaml` joins the page by `page.id` and exposes the fields |
| Odoo HR-user field visibility and employee form save | `employees.read` page access, `employees.write` employee create/edit actions, current-company and optimistic row-version guards |

No page-local SQL or duplicate frontend API contract was introduced.
