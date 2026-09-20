# Source comparison

## Odoo

- `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py` defines
  `private_car_plate = fields.Char(groups="hr.group_hr_user", ...)`.
- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` includes
  `<field name="private_car_plate" groups="hr.group_hr_user"/>` in the
  employee search view.
- The supplied Odoo list view does not show the optional field by default;
  therefore it is not present in the authenticated list body text in the
  captures.

## Core3

- `services/employees/migrations/20260922010000-055-employee-private-car-plate.yaml`
  adds durable storage and deterministic fixtures.
- `services/employees/pages/employees.yaml` adds the optional list column and
  search affordance.
- `services/employees/api/employees.yaml` adds list projection/search and
  guarded create persistence; `api/employee-detail.yaml` adds read/edit
  projection and guarded update fields.

The page and API contracts retain the existing `employees.read` and
`employees.write` boundaries, current-company guard, and optimistic row
version concurrency contract.
