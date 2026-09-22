# Source comparison

| Odoo 19 | Core3 | Result |
| --- | --- | --- |
| `project_task_views.xml`: form stat button `action_open_parent_task`, label `Parent Task`, invisible without `parent_id` | `pages/project-task-detail.yaml`: conditional `open_parent_task` stat button with `parent_task_name` | matched |
| `project_task.py`: returns a form action for `self.parent_id` | `api/task-detail.yaml`: `open_parent_task` navigates to `/tasks/detail?id=<parent_task_id>` | matched route behavior |
| `project.task` access controls apply to the opened parent | Core3 target task detail remains protected by `project.read` and its datasource | bounded match |

The Core3 implementation does not claim Odoo portal-specific parent-task URL
handling, chatter/follower behavior, or visual parity without authenticated
desktop/mobile captures.
