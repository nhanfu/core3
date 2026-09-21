# Source comparison

| Odoo source behavior | Core3 contract | Result |
| --- | --- | --- |
| `my_team`: `parent_id.user_id = uid` | `my_team` projection checks same-company `manager_id` and legacy `org_parent_name`/`manager_name` against the authenticated employee | pass; compatibility fallback is documented |
| `my_department`: `member_of_department = True` | `my_department` projection checks same-company `department_id` or department name against the authenticated employee | pass for the bounded flat department fixture |
| Search view labels | Employees `ListView` filter options use exact `My Team` and `My Department` labels | pass |
| Read/company security | Datasource remains `employees.read`; SQL always applies `current_company_name` and derives identity from `current_user_id` | pass |
| Responsive rendered states | Odoo and Core3 filtered desktop/mobile captures | blocked; authenticated Odoo tab was unavailable to the task-owned bsk session |
