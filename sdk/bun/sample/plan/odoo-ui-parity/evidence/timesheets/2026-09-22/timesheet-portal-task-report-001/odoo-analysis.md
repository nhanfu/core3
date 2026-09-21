# Odoo analysis

- Source controller: `addons/hr_timesheet/controllers/portal.py:175-180`.
  `_show_task_report` applies `_timesheet_get_portal_domain()`, restricts to
  the selected task, and calls `hr_timesheet.timesheet_report_task_timesheets`.
- Source portal template: `addons/hr_timesheet/views/project_task_portal_templates.xml:8-11`.
  A Timesheets-enabled portal task with visible rows exposes a new-tab
  `View Details` button using `task.get_portal_url(report_type='pdf')`.
- Source report binding: `addons/hr_timesheet/report/report_timesheet_templates.xml:215-222`.
  The bound report targets `account.analytic.line`, uses `qweb-pdf`, and
  renders the `hr_timesheet.report_timesheet_task` template.
- Observed authenticated reference: `http://localhost:8069/my/tasks/107?db=core3_reference`
  showed `Furniture Delivery`, the `View Details` button, a Timesheets table,
  and `Total Time Spent: 45:00`. The HTML report route
  `http://localhost:8069/my/tasks/107?db=core3_reference&report_type=html`
  showed `Timesheets for Furniture Delivery`, Date/Employee/Description/Time
  Spent columns, 45:00 total, and task-scoped rows in the captured tree.
