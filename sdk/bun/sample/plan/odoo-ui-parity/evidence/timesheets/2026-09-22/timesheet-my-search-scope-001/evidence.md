# TIMESHEET-MY-SEARCH-SCOPE-001 evidence

Date: 2026-09-22
Reference: Odoo 19 at `http://localhost:8069`, database `core3_reference`
Feature route: `/odoo/timesheets`

The authenticated Odoo My Timesheets page loaded in BrowserSkill. At desktop
width, the Group By menu showed Project, Parent Task, Task, Sales Order Item,
Invoice, and Billing Type. Employee, Department, and Manager were absent,
matching `hr_timesheet_line_my_timesheet_search` in the local Odoo source.

The mobile viewport loaded the same authenticated My Timesheets action as a
390x844 responsive list. The desktop and mobile captures are truthful Odoo
reference evidence only; no Core3 capture is claimed.

Browser ownership note: the visible existing Odoo user tab was already borrowed
by another BrowserSkill session (`goea`), so this pass used a task-owned tab
whose existing authenticated state loaded the requested route. No credential,
cookie, or token was read. The agent BrowserSkill session was stopped after
capture.

Core3 readiness blocker:

```text
error: Conflicting declarations for named action: base.activities.reschedule_today
at createYamlApi (sdk/bun/packages/server/src/routes/yaml-api.ts:259:19)
```

This is outside `services/timesheets` and prevented Core3 desktop/mobile visual
verification in the shared checkout.
