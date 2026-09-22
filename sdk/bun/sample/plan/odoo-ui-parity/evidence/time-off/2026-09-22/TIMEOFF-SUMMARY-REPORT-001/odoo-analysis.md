# Odoo analysis

The local Odoo 19 source is:

- `/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_holidays_reports.xml`
- `/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_holidays_templates.xml`
- `/home/nhanjs/projects/odoo/addons/hr_holidays/wizard/hr_holidays_summary_employees.py`
- `/home/nhanjs/projects/odoo/addons/hr_holidays/wizard/hr_holidays_summary_employees_views.xml`

`action_hr_holidays_summary_employee` opens the `Time Off Summary` modal with
`From`, `Select Time Off Type`, `Print`, and `Cancel`. Its `print_report`
method calls `action_report_holidayssummary`, whose report name is
`hr_holidays.report_holidayssummary`, report type is `qweb-pdf`, and paper
format is `paperformat_hrsummary`. The template renders a 60-day employee
calendar, total days, and leave-type legend.

BrowserSkill instance `245ea108` was healthy. The ordinary authenticated Odoo
tab (`Acme Corporation`, tab `1770662590`) was already borrowed by session
`ioxf`, so this worker did not repeat the borrow or use another login. A
task-created tab navigated to `http://localhost:8069/odoo/time-off` and
resolved to the Discuss shell, with no Time Off menu or `hr_holidays` action.
The desktop and mobile blocker captures are outside Git at:

- `/tmp/core3-odoo-parity/timeoff-summary-report-20260922/odoo-blocker-desktop.png`
- `/tmp/core3-odoo-parity/timeoff-summary-report-20260922/odoo-blocker-mobile.png`

The task-created Core3 tab reached the frontend, but its authenticated page
request returned `401 Unauthorized` at
`/api/pages/dashboard?lc=en&redirect=%2Ftime-off-reporting%2Fby-employee`.
No independent Core3 login was attempted. Core3 desktop/mobile visual parity
is therefore also unverified.
