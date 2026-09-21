# EMP-EMPLOYEE-TAGS-001 source comparison

| Surface | Odoo source | Core3 implementation | Evidence |
| --- | --- | --- | --- |
| Employee field | `hr.employee.category_ids` is a `Many2many` to `hr.employee.category`, labelled `Tags` and restricted to HR users | `employee_tags` and `employee_tag_ids` are read projections over durable `employee_tags` and `employee_tag_rel` tables | `services/employees/api/employee-detail.yaml`, focused mapping test |
| Assignment lifecycle | Odoo renders `category_ids` with `many2many_tags` and supports adding/removing taxonomy values | Separate `add_employee_tag` and `remove_employee_tag` line-item actions update the relation and employee `row_version` | `services/employees/pages/employee-detail.yaml`, `employees_tags.integration.test.ts` |
| Company/actor boundary | Odoo HR-user access controls the field | `employees.read` protects reads, `employees.write` protects mutations; actor, active/current-company, supported-tag, duplicate, relation, and stale-parent guards are explicit | Focused guard test |
| Persistence | Odoo stores the many-to-many relation | Migration `20260922130000-067-employee-tags.yaml` seeds deterministic tags/assignments and is replay-safe | CRUD/restart test |
| Responsive UI | Authenticated employee form exposes the source Tags control at desktop/mobile sizes | Authenticated Core3 desktop/mobile captures expose the Tags tab and the assignment grid; the current session company has no matching deterministic employee row | `core3-desktop.png`, `core3-mobile.png`, browser JSON |

The Core3 contract remains page/API separated by the shared `page.id` (`employee-detail`). The page contains no SQL; datasource and action contracts remain in the API YAML.
