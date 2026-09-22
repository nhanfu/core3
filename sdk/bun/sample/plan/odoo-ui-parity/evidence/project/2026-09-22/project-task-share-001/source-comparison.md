# Source comparison

- Odoo source action: `addons/project/views/project_task_views.xml`
  `portal_share_action`, bound to the task kanban menu as `Share Task`.
- Odoo wizard: `addons/project/wizard/project_task_share_wizard.py` defines
  `task.share.wizard` and inherits `portal.share`.
- Core3 page: `services/project/pages/project-task-detail.yaml`, action-menu
  id `share_project_task`.
- Core3 API: `services/project/api/task-detail.yaml`, page id
  `project-task-detail`, action `project.tasks.share`.
- Core3 persistence: migration
  `20260922180000-023-project-task-share.yaml`, table
  `project_task_shares`.

The Core3 boundary records the share request and deterministic link. It does
not claim Odoo mail composition, portal-user creation, access-token/signup
side effects, or chatter/follower subscription.
