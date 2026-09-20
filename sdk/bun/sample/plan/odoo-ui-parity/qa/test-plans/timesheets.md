# Timesheets detailed QA test plan

Module: timesheets
QA owner: timesheets-qa
Developer owner: timesheets module owner
Reference addon/version: hr_timesheet, Odoo 19 Community
Plan status: approved
Last reviewed: 2026-09-12

This plan follows [`timesheets.md`](../../timesheets.md); executed evidence is
recorded in [`../timesheets.md`](../timesheets.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Personal/all timesheets | personal, all, employee, detail and settings routes | Entry CRUD, scopes, approval, task/project links and settings |
| Reporting | analysis/report routes | Graph/pivot/list, date/project/employee filters and read-only data |
| Embedded integrations | Project task Timesheets tab and approval action | Project-owned hours mutation, relation loading and permission boundaries |

Actors are Timesheets Manager, employee, project manager, Fleet ordinary user,
wrong-company user and unauthenticated user. Fixtures use stable employees,
projects, tasks, timesheet entries, approvals and report rows; mutations use
isolated databases and deterministic dates.

## Functional, workflow, security, and visual gates

| Case ID | Expected result | Status |
| --- | --- | --- |
| TIMESHEET-FUNC-001 | Personal/all/employee CRUD, scoped actions, settings and embedded-task contracts use persisted data | pass: focused suite |
| TIMESHEET-FUNC-002 | Analysis renders Graph/Pivot/List with declared fields, filters, empty and transport states | pass: fixed contract and authenticated retest |
| TIMESHEET-WF-001 | Draft → Submitted → Approved updates versions and dispatches Project-owned hours with row-derived inputs | pass: authenticated probe |
| TIMESHEET-FUNC-003 | Create → edit → delete persists; stale/post-delete actions are denied without partial writes | pass: authenticated CRUD probe |
| TIMESHEET-PERM-001 | Manager/employee boundaries succeed; Fleet receives expected 403 for read/manage/settings/approval; cross-company data is isolated | partial: Fleet boundary verified |
| TIMESHEET-DATA-001 | Reapply schema/demo data idempotently; reload/restart preserves entries, approvals and linked hours | reload pass; restart planned |
| TIMESHEET-FUNC-005 | Entry-bound `hr_timesheet.timesheet_report` records a personal/company-scoped print run with stale, missing, invalid, and restart guards | pass: focused report-binding suite |
| TIMESHEET-CALENDAR-MULTI-CREATE | Odoo calendar multi-create creates one durable Draft entry per selected day with permission and relation guards | pass: 4 tests / 21 assertions; authenticated desktop/mobile evidence |
| TIMESHEET-TASK-REPORT-BINDING | Task-context Print action derives scoped project/task context, persists report history, and rejects stale, empty, actor, company, and missing-task requests without partial writes | pass: 4 tests / 20 assertions; authenticated Core3 desktop/mobile evidence; paired Odoo report action blocked by reference UI |
| TIMESHEET-PROJECT-REPORT-BINDING | Project-context Print action derives scoped project context, persists report history, and rejects stale, empty, actor, company, and missing-project requests without partial writes | pass: 4 tests / 21 assertions; authenticated Core3 desktop/mobile evidence; paired Odoo report action blocked by reference UI |
| TIMESHEET-TASK-TIMESHEETS-REPORT | Task-context analytic-line renderer persists report metadata and rejects stale, empty, actor, company, and missing-task requests without partial writes | pass: 4 tests / 20 expectations; clean isolated full suite 53/53; authenticated Core3 desktop/mobile evidence; paired Odoo Print action blocked by reference UI |
| TIMESHEET-REPORT-PREVIEW-RENDERER | Entry-bound report run creates and reads a durable authenticated preview with employee/company visibility and stale/missing/actor guards | pass: 4 tests / 20 expectations; clean isolated full suite 57/57 (436 expectations); authenticated Core3 desktop/mobile preview evidence; Odoo visible Print/preview action blocked |
| TIMESHEET-ALL-ENTRY-REPORT-ACTION | Manager All Timesheets detail exposes a durable company/actor/stale-guarded report action and restart-safe preview | pass: 3 tests / 16 expectations; full suite 60/60 (452 expectations); authenticated Core3 desktop/mobile evidence; Odoo All Timesheets Print action not visible |
| TIMESHEET-EMPLOYEE-REPORT-ACTION | Employee-context Timesheets action exposes a durable scoped report run with employee/company/actor/stale/empty guards and restart persistence | pass: focused 4 tests / 23 expectations; full suite 64/64 (475 expectations); authenticated Core3 desktop/mobile evidence; Odoo employee stat is empty/new-entry-only |
| TIMESHEET-REPORT-EMPLOYEE-DRILLDOWN | By Employee analysis rows expose a manager/company-guarded route to persisted Timesheet detail and survive restart | pass: focused 4 tests / 15 expectations; full shared suite 68/68 (490 expectations); authenticated Core3 desktop/mobile evidence; Odoo aggregate route has no visible row-form action |
| TIMESHEET-PROJECT-DASHBOARD-SCOPE-GUARDS | Project dashboard embedded Timesheets rows/totals enforce the Odoo timesheetable/analytic/company scope and survive restart | pass: focused 4 tests / 26 expectations; full shared suite 72/72 (516 expectations); authenticated Core3 desktop/mobile evidence with Project mobile overflow blocker; Odoo loaded project route has no visible Timesheets embedded action |
| TIMESHEET-PROJECT-REPORT-PREVIEW | Project `timesheet_report_project` action renders a durable company/project-scoped YAML preview with persisted lines and restart-safe guards | pass: focused 4 tests / 22 expectations; authenticated Core3 desktop/mobile preview evidence; Odoo project route has no visible Print/report action |
| TIMESHEET-TASK-REPORT-PREVIEW | Task `timesheet_report_task` action renders a durable company/task-scoped YAML preview with persisted lines and restart-safe guards | pass: focused 4 tests / 23 expectations; authenticated Core3 desktop/mobile preview evidence; Odoo task route has no visible Print/report action |
| TIMESHEET-EMPLOYEE-REPORT-PREVIEW | Employee context report renders a durable company/employee-scoped YAML preview with persisted lines and restart-safe guards | pass: focused 4 tests / 23 expectations; authenticated Core3 desktop/mobile preview evidence; Odoo employee route is empty/new-entry-only with no visible Print/report action |
| TIMESHEET-TASK-TIMESHEET-LINES-PREVIEW | Task analytic-line `timesheet_report_task_timesheets` action renders a durable company/task-scoped YAML preview with persisted lines and restart-safe guards | pass: focused 4 tests / 23 expectations; authenticated Core3 desktop/mobile `Print lines` evidence; Odoo task route has no visible Print/report action, exact QWeb/PDF blocker |
| TIMESHEET-REPORT-PROJECT-DRILLDOWN | By Project analysis rows expose a manager/company-guarded action into the durable Project Timesheets context and survive restart | pass: focused 4 tests / 16 expectations; authenticated Core3 desktop/mobile row-action evidence; Odoo aggregate route has no loaded row-to-project-timesheet action |
| TIMESHEET-UI-001 | All 13 routes render at 1440x900 and 390x844 without errors or overflow | route 26/26 pass |
| TIMESHEET-UI-002 | My/All/By Employee, task tab, forms and reports match paired Odoo states | 12 representative captures pass; remaining states planned |
| TIMESHEET-INT-001 | Project, payroll, calendar, notification and other durable integrations use Temporal with retry/replay/restart/compensation coverage | planned |

## Exit criteria

Full sign-off requires complete route/action CRUD, all actor and company
boundaries, restart persistence, remaining embedded/report interactions, and
paired Odoo desktop/mobile comparisons. Current evidence is conditional.
