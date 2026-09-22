# Source-to-Core3 comparison

| Odoo behavior | Core3 implementation | Evidence |
| --- | --- | --- |
| Department kanban menu action | `open_department_children` on the existing departments API | `services/employees/api/departments.yaml` |
| `child_of` hierarchy | Durable `parent_id` plus recursive `department_tree` CTE | migration `20260923040000-094-department-hierarchy.yaml`; `api/department-children.yaml` |
| `kanban,list,form` result views | Shared `ListView` with Odoo view order and responsive cards | `pages/department-children.yaml` |
| Odoo action name | Page title and breadcrumb `Child departments` | `page.id: employee-department-children` |
| Read access | `employees.read` on page, datasource, and row navigation | page/API YAML contracts |
| Missing/empty/transport boundaries | 404, deterministic empty state, and 503 error contract | API `error_states` and focused integration test |

The page and API remain separate YAML contracts joined only by their matching
`page.id`, and the slice has no mutation path requiring stale-write handling.
