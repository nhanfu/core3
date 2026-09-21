# Timesheets Wave 46 QA inventory

Feature: `TIMESHEET-PORTAL-TASK-HOURS-SUMMARY-001`

- Source behavior: Odoo's `project.task._get_portal_total_hours_dict` exposes
  allocated and effective hours for portal task groups and removes descendant
  tasks from the parent total.
- Core3 surface: `/my/projects/task/timesheets` now renders a guarded Task
  time progress StatRow above the existing list, Kanban, and read-only Form.
- Durable behavior: migration 029 persists `allow_timesheets` on task rows and
  adds the portal-hours lookup index; relation updates survive file-backed
  restart.
- Guards: `project.portal`, actor, company, task grant, missing, empty, and
  expected task row-version stale checks are covered.
- Runtime evidence intended: authenticated Core3 desktop summary/list and
  mobile Kanban; paired Odoo task portal comparison. Playwright reached both
  login boundaries without credentials, so no authenticated screenshot or
  visual sign-off is claimed.
