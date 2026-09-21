# Source comparison

| Odoo source | Core3 contract | Evidence |
| --- | --- | --- |
| `hr_employee.py`: `parent_id = fields.Many2one('hr.employee', 'Manager', ...)` | `employees.manager_id` plus `manager_name`; the active `employee_versions` row stores the same relation and label | Focused source-mapping test |
| `hr_employee_views.xml`: Work group `parent_id` with `many2one_avatar_employee` | Separate employee-detail page/API contracts retain Work > Manager and add `employee_manager_options` plus `edit_employee_manager` | Authenticated Odoo desktop/mobile captures |
| Odoo company domain on `parent_id` | Options and mutation guards require an active manager in the target employee's company; self and recursive subordinate assignments are rejected | Focused guard test |

The existing free-text `manager_name` was not sufficient parity for the
Many2one source relation. This slice adds the durable relation without
duplicating prior Coach or Work Location behavior.
