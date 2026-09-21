# Timesheets portal task report — `TIMESHEET-PORTAL-TASK-REPORT-001`

Date: 2026-09-22

This bounded slice implements Odoo's portal task `View Details` workflow for
Timesheets. It is distinct from `TIMESHEET-PORTAL-GROUPING-001`: grouping stays
on `/my/timesheets`, while this feature records a portal-user/task-scoped
report run and opens a separate read-only report document.

Implemented artifacts:

- `services/timesheets/pages/portal-task-timesheet-detail.yaml`
- `services/timesheets/api/portal-task-timesheet-detail.yaml`
- `services/timesheets/pages/portal-task-timesheet-report-preview.yaml`
- `services/timesheets/api/portal-task-timesheet-report-preview.yaml`
- `services/timesheets/migrations/20260922100000-031-timesheets-portal-task-report.yaml`
- `test/timesheets_portal_task_report.integration.test.ts`

Browser capture status is intentionally partial. The authenticated Odoo
reference was observed at task 107 and its HTML report route. The BrowserSkill
session was closed before the Core3 authenticated desktop/mobile capture; no
visual parity claim is made and no screenshot is represented as captured.
