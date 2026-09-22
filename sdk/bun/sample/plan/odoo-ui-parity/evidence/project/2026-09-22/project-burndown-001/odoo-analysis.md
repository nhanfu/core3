# Odoo analysis

- Addon/source: `/home/nhanjs/projects/odoo/addons/project`, local Odoo 19
  checkout at source revision `65975996`.
- Record action: `project.project.action_project_task_burndown_chart_report`.
- Odoo source menu entry: the Project kanban card Reporting menu exposes
  `action_project_task_burndown_chart_report` with label `Burndown Chart` for
  `project.group_project_user` (`views/project_project_views.xml:388-397`).
- Window action: `action_project_task_burndown_chart_report` uses model
  `project.task.burndown.chart.report`, path `burndown-chart`, graph-only view
  mode, and defaults the active project, date grouping, stage grouping, and
  date filter (`report/project_task_burndown_chart_report_views.xml:36-60`).
- Graph: line chart grouped by weekly `Date` and `Stage`, with `Is Closed`
  available for the burn-up variant (`report/project_task_burndown_chart_report_views.xml:25-43`).
- Report model: Odoo computes task stage history and exposes `# of Tasks`; the
  project method returns a project-specific display name and stage ordering
  context (`models/project_project.py:885-899`).
- Odoo search facets include tags, assignees, stage, project, milestone,
  customer, My Tasks, Unassigned, date/deadline filters, Open Tasks, Closed
  Tasks, Date, Stage, and Is Closed.

The shared authenticated live tab could not be borrowed in this run, so the
source contract above is the evidence basis; no live visual state is claimed.
