# EMP-EMPLOYEE-TIMEZONE-001 source comparison

| Surface | Odoo source | Core3 implementation | Evidence |
| --- | --- | --- | --- |
| Employee field | `hr.employee.tz` is a tracked `fields.Selection`; the form renders `<field name="tz" required="id"/>` in Settings | Existing durable `employees.timezone` projection is normalized by migration `20260922140000-068` and exposed through the employee detail datasource | Odoo source files, migration, focused mapping test |
| CRUD/action | Odoo permits changing the employee timezone from Settings | Employee creation accepts the supported timezone set; `edit_employee_timezone` provides a dedicated Employees-write update action with optimistic row-version protection | `services/employees/api/employees.yaml`, `services/employees/api/employee-detail.yaml` |
| Page/API separation | Settings is part of the employee form | Settings remains page-only; the header action and field join the API through `page.id: employee-detail` | `services/employees/pages/employee-detail.yaml` |
| Guarding | Odoo employee access controls the field | `employees.write`, authenticated actor, active/current-company employee, supported-value, and stale-row guards are explicit | Focused guard test |
| Responsive surface | Authenticated Odoo employee Settings form exposes the timezone control | Core3 browser attempt was blocked before backend discovery by an unrelated shared page-schema error; exact blocker is recorded in `core3-blocker.json` | Odoo PNGs and blocker JSON |

The supported deterministic values are `UTC`, `Asia/Ho_Chi_Minh`, `Asia/Tokyo`,
`Europe/London`, and `America/Los_Angeles`. Core3 does not claim synchronization
to the separate auth user timezone database in this bounded slice.
