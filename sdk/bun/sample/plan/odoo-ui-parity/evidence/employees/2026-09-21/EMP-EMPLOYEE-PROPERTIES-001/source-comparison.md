# Source comparison

| Surface | Odoo source | Core3 implementation | Result |
| --- | --- | --- | --- |
| Employee field | `hr_employee.py` defines `employee_properties = fields.Properties('Properties', definition='company_id.employee_properties_definition', groups='hr.group_hr_user')` | `employees.employee_properties` stores the object as durable JSON text, with deterministic fixtures | focused test pass |
| Form placement | `hr_employee_views.xml` renders `<field name="employee_properties" columns="2"/>` above the notebook | Employee detail has a read-gated Properties group and a separate write-gated action | YAML mapping pass |
| Write boundary | Odoo field is HR-user-only and company-definition-backed | `employees.write`, actor, active/current-company, row-version, and object-shape guards | CRUD/permission/restart pass |
| Browser comparison | Authenticated employee detail desktop/mobile | Odoo detail captured; reference Properties definition is empty | conditional |

The Core3 value is intentionally treated as an opaque object because the
reference company's dynamic Properties definition is not represented in the
sample catalog. Invalid non-object input is rejected; blank input normalizes
to `{}`.
