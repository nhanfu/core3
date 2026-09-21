# PROJECT-TASK-SUBTASKS-001

Bounded Project parity slice for Odoo `project.task.child_ids` / `parent_id`.

The Core3 project list/task-table flow is captured, including two seeded child
rows. Opening Core3 task detail is blocked by the existing embedded Timesheets
datasource in the Project task page: a Project-only runtime does not register
`yaml.service.timesheets`. Shared all-module startup has the separate
pre-existing Employees YAML validation blocker. No authenticated task-detail
CRUD claim is made.
