# EMP-EMPLOYEE-PROPERTIES-001 evidence

This slice covers Odoo's HR-user `hr.employee.employee_properties` field. The
source employee form renders it above the Work notebook with `columns="2"`,
and the search view provides a Properties group-by. Core3 stores the opaque
company-defined object durably, displays it in the employee detail page, and
updates it through a guarded `Edit Properties` action.

Authenticated Odoo captures:

- `odoo-desktop.png` — 1440x900, employee detail `/odoo/employees/6`.
- `odoo-mobile.png` — 390x844, employee detail `/odoo/employees/6`.

Both Odoo routes returned HTTP 200. The reference company has no configured
employee Properties definition/value, so `Properties` is not visible in the
rendered text even though the source XML field is present. Core3 evidence is a
runtime blocker: Vite/login responds, but the backend never bound port 3001 in
the bounded startup window; the isolated module startup also reported the
shared `actions[2].fields must be a non-empty array` schema error. No Core3
visual sign-off is claimed.
