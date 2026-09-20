# Source comparison

| Concern | Odoo source | Core3 implementation |
| --- | --- | --- |
| Form control | `addons/hr/views/hr_employee_views.xml:402-406` renders Badge ID, `Generate`, and conditional `Print Badge` controls in the employee Settings tab. | `services/employees/pages/employee-detail.yaml:21` binds a permissioned Generate Badge ID header action to the existing Settings Badge ID field. The larger Print Badge report remains a separate gap. |
| Mutation | `addons/hr/models/hr_employee.py:1541-1543` assigns `041` plus nine digits. | `services/employees/api/employee-detail.yaml:97-124` derives a deterministic `041` + employee-number suffix for fixtures, with an alphanumeric ID fallback, then updates `employees.barcode`. |
| Constraints | `hr_employee.py:244-247` enforces unique barcode; `1296-1301` enforces alphanumeric and max length 18. | `20260920200000-031-employee-barcode-generation.yaml` adds the durable unique index. API guards enforce the same format/length and return domain errors before mutation. |
| Scope/security | Odoo exposes the field to `hr.group_hr_user`; form action is an employee write operation. | Action permission is `employees.write`; mutation requires a non-empty authenticated actor, active employee, current company, and matching row version. |
| Determinism | Odoo output is random by design. | Fixtures use deterministic generation so integration/restart assertions are reproducible while preserving Odoo's format and constraints. |
