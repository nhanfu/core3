# Odoo source comparison and blocker

The focused source comparison covers:

- `hr_timesheet/models/project_task.py`: `action_view_subtask_timesheet`
  collects the task and all descendants, then applies a `task_id in task_ids`
  domain and the project context.
- `hr_timesheet/views/hr_timesheet_views.xml`: the task Timesheets action uses
  the shared list/form/kanban/pivot/graph family.

Core3 maps the task-context descendant scope to the existing
`task-timesheets` page/API pair. The page defaults Include sub-tasks and the
API expands durable child-task rows only when that context is enabled; callers
without it retain exact-task reads.

Authenticated route/action comparison was blocked because both configured Odoo
instances served `/web/login` without an authenticated session:

```text
127.0.0.1:8069/web/login -> HTTP 200
127.0.0.1:8073/web/login -> HTTP 200
```

Existing Odoo Print/PDF/action surfaces remain separate blockers; no module
sign-off is claimed.
