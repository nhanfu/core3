# PROJECT-TASK-PARENT-001

Bounded parity evidence for Odoo Project task-form `Parent Task` navigation.

- Odoo source: `addons/project/views/project_task_views.xml` defines the
  `Parent Task` stat button and `addons/project/models/project_task.py`
  implements `action_open_parent_task`.
- Core3: `services/project/pages/project-task-detail.yaml` owns the stat
  presentation and `services/project/api/task-detail.yaml` owns the
  `open_parent_task` navigation action; both use `page.id:
  project-task-detail`.
- Persistence: the existing `project_tasks.parent_task_id` relation and
  `parent_task_name` projection are exercised by the focused test.

Authenticated desktop/mobile screenshots are intentionally not included until
the shared Odoo tab can be borrowed through BrowserSkill.
