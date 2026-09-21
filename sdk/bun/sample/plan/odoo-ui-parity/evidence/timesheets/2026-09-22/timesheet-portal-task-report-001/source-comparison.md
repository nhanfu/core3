# Source comparison

| Odoo contract | Core3 mapping | Result |
| --- | --- | --- |
| Portal task `View Details` button | `view_portal_task_timesheet_report` on the existing portal task-timesheet detail page | implemented |
| `_show_task_report` task + portal domain | `portal_task_timesheet_report_context` and report mutation use current task, portal grant, company, active timesheetable project, and allowed privacy | implemented |
| `timesheet_report_task_timesheets` QWeb binding | Durable `timesheet_portal_task_report_runs` plus `portal-task-timesheet-report-preview` page/API | implemented as YAML report document |
| Date/Employee/Description/Time Spent table and total | Read-only Odoo `ListView` plus report summary fields | implemented |
| PDF/new-tab renderer | Core3 Print action calls browser print from the persisted preview | deliberate runtime limitation; QWeb/PDF equivalence not claimed |
