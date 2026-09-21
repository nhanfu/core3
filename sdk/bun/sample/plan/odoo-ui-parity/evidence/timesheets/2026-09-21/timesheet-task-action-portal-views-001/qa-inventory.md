# Timesheets Wave 45 QA inventory

Feature: `TIMESHEET-TASK-ACTION-PORTAL-VIEWS-001`

- Source behavior: the non-internal or project-sharing branch of
  `project.task.action_view_subtask_timesheet` replaces unsupported internal
  views with the portal tree, read-only Form, and Kanban views.
- Core3 surface: `/my/projects/task/timesheets` provides list and mobile
  Kanban; `/my/projects/task/timesheet/detail` provides the read-only detail
  Form. The list and detail page/API contracts are separate and joined by
  matching `page.id` values.
- Durable behavior: migration 028 persists a task/user/company portal grant;
  migration replay and file-backed reopen preserve the detail projection.
- Guards: `project.portal`, actor, company, task/subtask, missing, empty, and
  expected task row-version stale checks are covered.
- Runtime evidence intended: authenticated Core3 desktop list/Form and mobile
  Kanban; paired Odoo task-action comparison. Runtime was unavailable, so no
  screenshot or visual sign-off is claimed.
