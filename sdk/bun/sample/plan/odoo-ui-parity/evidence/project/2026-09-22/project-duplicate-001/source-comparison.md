# Source comparison

- Odoo source view: `addons/project/views/project_project_views.xml` exposes
  the manager-only kanban `type="object" name="copy"` action labelled
  `Duplicate`.
- Odoo source model: `addons/project/models/project_project.py` implements
  `copy_data`, `copy`, and `map_tasks`; ordinary copies use `Project (copy)`,
  copy milestones, preserve task names/stages, start copied tasks in progress,
  and map copied task descendants/dependencies.
- Core3 page: `services/project/pages/projects.yaml`, row action
  `duplicate_project`; the page remains layout-only apart from the binding.
- Core3 API: `services/project/api/projects.yaml`, page id `projects`, server
  action `project.projects.duplicate`.
- Core3 persistence: existing `projects`, `project_milestones`,
  `project_tasks`, `project_task_recurrences`, and
  `project_task_dependencies` tables; no migration was required.
