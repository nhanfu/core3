# Source comparison

- Odoo source view: `addons/project/views/project_task_views.xml` exposes
  `type="object" name="copy"` with the label `Duplicate` in the task kanban
  menu.
- Odoo source model: `addons/project/models/project_task.py` implements
  `copy_data` and `copy`; it names ordinary copies `Task (copy)`, restores
  inactive copies, recursively copies active children, keeps active assignees,
  and clears task dependencies before resolving copied records.
- Core3 page: `services/project/pages/project-task-detail.yaml`, action-menu
  id `duplicate_project_task`.
- Core3 API: `services/project/api/task-detail.yaml`, page id
  `project-task-detail`, action `project.tasks.duplicate`.
- Core3 persistence: the existing durable `project_tasks` table; no schema
  migration was needed. The mutation inserts the root and recursive active
  child copies, refreshes denormalized subtask summaries, then increments the
  source row version in one transaction.

The bounded contract intentionally does not copy Odoo chatter/followers,
attachments, portal shares, or recurrence rules. Dependencies are reset as in
the source `copy_data` contract rather than copied to the new task.
