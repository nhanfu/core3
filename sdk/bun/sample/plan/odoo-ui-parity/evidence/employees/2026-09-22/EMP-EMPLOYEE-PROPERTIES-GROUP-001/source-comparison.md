# EMP-EMPLOYEE-PROPERTIES-GROUP-001 source comparison

## Odoo source

- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` defines
  `group_by_employee_properties` with
  `context="{'group_by': 'employee_properties'}"` in the Employees search
  view.
- The same view renders `employee_properties` in the Employee kanban and form
  surfaces.

## Core3 implementation

- `services/employees/pages/employees.yaml` exposes Properties as an Employees
  list group-by through `page.id: employees`.
- `services/employees/api/employees.yaml` includes `employee_properties` in
  the Employees pivot fields and projects the durable JSON value.
- The datasource remains protected by `employees.read` and current-company
  filtering; no migration is required because migration `0.0.54` owns the
  durable field and deterministic fixtures.
