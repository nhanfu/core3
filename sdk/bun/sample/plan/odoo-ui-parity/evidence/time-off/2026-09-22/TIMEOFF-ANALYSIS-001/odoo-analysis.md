# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd`.

The local source defines `hr_leave_report_action` in
`addons/hr_holidays/report/hr_leave_reports.xml:94-111` as `Time Off
Analysis`, model `hr.leave.report`, with `graph,pivot` modes and context for
employee/type grouping and monthly date grouping. The report view in
`report/hr_leave_report.py:37-87` unions allocations and requests, exposes
number of days/hours, department, type, state, and dates, and uses positive
allocation versus negative request measures.

Live BrowserSkill verification used browser instance `245ea108` and an
authenticated task-created tab. `/odoo/time-off` loaded the Discuss shell,
not the Time Off application, so the action could not be opened. The desktop
and mobile captures in this folder are truthful blocker evidence. No Odoo
database mutation was attempted.
