# Source comparison

| Odoo behavior | Core3 current gap | Core3 implementation |
| --- | --- | --- |
| `hr.employee.newly_hired` computed from `create_date > now - 90 days` | Employees list had no equivalent filter; Directory had a separate projection | `employees` datasource exposes `newly_hired` from durable `created_at` using the deterministic 2026-01-15 cutoff |
| Employees search filter labelled `Newly Hired` | `pages/employees.yaml` had Status, Department, Coach, and Records only | Layout-only Hiring filter in `pages/employees.yaml`; API remains in `api/employees.yaml` and joins by `page.id` |
| Search respects allowed company scope | Existing Employees query already scoped current company | Newly Hired predicate is applied inside the same company-scoped query |
