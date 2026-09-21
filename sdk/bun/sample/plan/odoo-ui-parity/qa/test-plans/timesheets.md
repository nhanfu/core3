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
| TIMESHEET-REPORT-TASK-DRILLDOWN | By Task analysis rows expose a manager/company-guarded action into the durable Task Timesheets context and survive restart | pass: focused 4 tests / 16 expectations; authenticated Core3 desktop/mobile row-action evidence; Odoo aggregate route has no loaded row-to-task-timesheet action |
| TIMESHEET-ANALYSIS-DRILLDOWN | Analysis rows expose a company-scoped action into the durable Timesheet detail context and survive restart | pass: focused 4 tests / 20 expectations; authenticated Core3 desktop/mobile row-action evidence; Odoo aggregate route has no loaded row-to-analysis-form action |
| TIMESHEET-REPORT-BILLING-DRILLDOWN | Billing Type report rows expose a company-scoped action into the durable Timesheet detail context and survive restart | pass: focused 4 tests / 20 expectations; authenticated Odoo desktop/mobile aggregate evidence; Core3 browser blocked by shared Surveys/Accounting discovery errors; Odoo route has no loaded row-to-entry action |
| TIMESHEET-PORTAL-MY-TIMESHEETS | Authenticated Odoo `/my/timesheets` portal list maps to a durable Core3 portal route with actor/company guards and own-scope row navigation | pass: focused 4 tests / 29 expectations; Core3/Odoo desktop+mobile evidence; Odoo loaded portal state has no row-to-detail action |
| TIMESHEET-MY-ANALYSIS-VIEWS | Personal Timesheets Pivot/Graph action views map to durable page/API contracts with scoped rows and responsive visibility | pass: focused 7 tests / 59 expectations; Core3/Odoo desktop+mobile evidence; prior Odoo Print/PDF/action blockers remain open |
| TIMESHEET-PORTAL-DATE-FILTERS | Authenticated portal date filters map Odoo All/week/month/quarter/year choices to durable scoped Core3 reads | pass: focused 8 tests / 61 expectations; Odoo desktop/mobile filter evidence; Core3 browser blocked by unowned Employees discovery schema error |
| TIMESHEET-PORTAL-SORTING | Authenticated portal Newest/Employee/Project/Task/Description sorts map to deterministic durable scoped Core3 reads | pass: focused 12 tests / 88 expectations across portal suites; Odoo desktop/mobile project-sort evidence; Core3 blocked by unowned Ecommerce discovery YAML |
| TIMESHEET-ALL-COMPANY-SCOPE | Odoo All Timesheets analytic-line company rules map to durable scoped Core3 list/detail reads and guarded approver edits | pass: focused 7 tests / 65 expectations; authenticated Core3/Odoo desktop+mobile evidence; visual company switch unavailable in single-company browser; Core3 mobile list clipping remains open |
| TIMESHEET-TASK-PROGRESS-001 | Task Timesheets exposes durable allocated/effective/remaining/progress/overtime context with permission/company/empty/concurrency/restart coverage | pass: focused 4 tests / 27 expectations; task/report regression selection 19/19 (107 expectations); authenticated Core3/Odoo desktop+mobile evidence; Odoo fixture/time-widget differs, existing Print/PDF/action blockers remain |
| TIMESHEET-UOM-ENCODING-001 | My Timesheets renders company-configured Hours/Minutes or Days/Half-Days through durable page/API contracts with permission/company/stale/restart coverage | pass: focused UoM/settings/My Timesheets run 10/10 (67 expectations); authenticated Odoo desktop/mobile evidence; Core3 blocked by unrelated Inventory discovery errors; live Odoo Days-mode reference unavailable |
| TIMESHEET-MY-WEEK-DEFAULT-001 | Internal My Timesheets opens with Odoo's authenticated default-week action context through separate durable page/API contracts and guarded detail writes | pass: focused 4 tests / 19 expectations; authenticated Core3/Odoo desktop/mobile evidence; Core3 has only aborted unrelated All Timesheets prefetches; Print/PDF/action blockers remain |
| TIMESHEET-MY-INLINE-EDIT-001 | Odoo editable-top My Timesheets rows create/update durable activity entries with actor/company/relation/stale guards and separate page/API contracts | pass: focused 4 tests / 19 expectations; full Timesheets glob 140/140 (905 expectations); authenticated Core3/Odoo desktop+mobile evidence; mobile inline editing and broader Print/PDF/action parity remain blocked |
| TIMESHEET-UI-001 | All 13 routes render at 1440x900 and 390x844 without errors or overflow | route 26/26 pass |
| TIMESHEET-UI-002 | My/All/By Employee, task tab, forms and reports match paired Odoo states | 12 representative captures pass; remaining states planned |
| TIMESHEET-PARENT-TASK-GROUP-001 | Authenticated My Timesheets exposes durable Odoo Parent Task group-by context with page/API separation, actor/company/empty/stale guards, and restart persistence | pass: focused 4 tests / 24 expectations; authenticated Odoo desktop/mobile evidence; Core3 capture blocked by unrelated page discovery schema error; Print/PDF/action parity remains open |
| TIMESHEET-MY-TOTAL-FOOTER-001 | My Timesheets exposes Odoo's durable, filter-aware Time Spent Total footer through separate page/API YAML with permission, company, stale, and restart coverage | pass: focused 4 tests / 23 expectations; authenticated Odoo desktop/mobile evidence; Core3 backend readiness blocker recorded; Print/PDF/action parity remains open |
| TIMESHEET-INT-001 | Project, payroll, calendar, notification and other durable integrations use Temporal with retry/replay/restart/compensation coverage | planned |

## Exit criteria

Full sign-off requires complete route/action CRUD, all actor and company
boundaries, restart persistence, remaining embedded/report interactions, and
paired Odoo desktop/mobile comparisons. Current evidence is conditional.

## Eleventh-wave execution — `TIMESHEET-MY-DEPARTMENT-GROUP-001`

The Department group-by source comparison and durable contract are covered by
`test/timesheets_my_department_group.integration.test.ts` (4 tests / 28
expectations). The test exercises page/API separation, migration-backed
department relation reads, active actor and company scope, empty fixtures,
required optimistic concurrency, migration replay, and file-backed restart.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-my-department-group/`: desktop
exposes and applies Department grouping; mobile exposes the responsive Kanban
but not the desktop search panel. Core3 desktop/mobile evidence is blocked by
the bounded startup's unavailable backend 3001, with the exact output
preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known
blocker and no module sign-off is claimed.
## Twelfth-wave execution — `TIMESHEET-MY-MANAGER-GROUP-001`

The Manager group-by source comparison and durable contract are covered by
`test/timesheets_my_manager_group.integration.test.ts` (4 tests / 28
expectations). The test exercises page/API separation, migration-backed
manager relation reads, active actor and company scope, empty fixtures,
required optimistic concurrency, migration replay, and file-backed restart.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-my-manager-group/`: desktop
exposes and applies Manager grouping; mobile exposes responsive Kanban but
not the desktop search panel. Core3 desktop/mobile evidence is blocked by an
unrelated `discoverPages` `max_length is not allowed` schema failure, with the
exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces
remain a known blocker and no module sign-off is claimed.

## Wave 13 execution — `TIMESHEET-ALL-EMPLOYEE-GROUP-001`

The All Timesheets Employee group-by source comparison and durable contract are covered by `test/timesheets_all_employee_group.integration.test.ts` (4 tests / 23 expectations). The test exercises page/API separation, durable employee relation reads, actor/company/empty guards, required optimistic concurrency, and file-backed restart.

Authenticated Odoo captures are in `../evidence/timesheets/2026-09-21/timesheet-all-employee-group/`: desktop exposes and applies Employee grouping; mobile exposes responsive Kanban but not the desktop search panel. Core3 desktop/mobile evidence is blocked by the shared `discoverPages` `actions[2].fields must be a non-empty array` schema failure, with exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known blocker and no module sign-off is claimed.

## Wave 14 execution — `TIMESHEET-ALL-CALENDAR-MULTI-CREATE-001`

The All Timesheets calendar multi-create source comparison and durable contract are covered by `test/timesheets_all_calendar_multi_create.integration.test.ts` (4 tests / 25 expectations). The test exercises page/API separation, manager permission declaration, active employee/company/relation/range guards, no-partial-write behavior, deterministic migration replay, and file-backed restart.

Authenticated Odoo captures are in `../evidence/timesheets/2026-09-21/timesheet-all-calendar-multi-create/`: desktop renders the authenticated calendar and mobile renders responsive Kanban without page errors. The runtime did not expose a standard desktop New/Create toolbar button for the multi-create dialog, so that surface is not claimed. Core3 desktop/mobile evidence is blocked by the shared `discoverPages` `components[1].title is not allowed` schema failure, with exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known blocker and no module sign-off is claimed.

## Wave 15 execution — `TIMESHEET-ALL-EMPLOYEE-FILTER-001`

The All Timesheets Employee search-field source comparison and durable contract are covered by `test/timesheets_all_employee_filter.integration.test.ts` (3 tests / 18 expectations). The test exercises page/API separation, persisted employee filtering, manager permission, current-company and empty-fixture guards, and file-backed restart.

Authenticated Odoo captures are in `../evidence/timesheets/2026-09-21/timesheet-all-employee-filter/`: desktop applies Employee = Mitchell and renders `1-42 / 42`; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile evidence is blocked before authentication because backend `3001/api/modules` did not expose `/api/modules` during the bounded startup probe, with exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known blocker and no module sign-off is claimed.

## Wave 16 execution — `TIMESHEET-ALL-PROJECT-FILTER-001`

The All Timesheets Project search-field source comparison and durable contract are covered by `test/timesheets_all_project_filter.integration.test.ts` (3 tests / 20 expectations). The test exercises page/API separation, persisted project filtering, active project options, manager permission, current-company and empty-fixture guards, and file-backed restart.

Authenticated Odoo captures are in `../evidence/timesheets/2026-09-21/timesheet-all-project-filter/`: desktop applies Project = Research & Development and renders `1-80 / 159`; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile evidence is blocked before authentication because backend `3001/api/modules` did not expose `/api/modules` during the bounded startup probe, with exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known blocker and no module sign-off is claimed.

## Wave 17 execution — `TIMESHEET-ALL-TASK-FILTER-001`

The All Timesheets Task search-field source comparison and durable contract are covered by `test/timesheets_all_task_filter.integration.test.ts` (3 tests / 21 expectations). The test exercises page/API separation, persisted task filtering, active task options, manager permission, current-company and empty-fixture guards, and file-backed restart.

Authenticated Odoo captures are in `../evidence/timesheets/2026-09-21/timesheet-all-task-filter/`: desktop applies Task = Create new components and renders `1-25 / 25` with `38:00`; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile evidence is blocked before authentication because shared page discovery rejects `actions[1].title is not allowed`, with exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known blocker and no module sign-off is claimed.

## Wave 18 execution — `TIMESHEET-ALL-MY-FILTER-001`

The All Timesheets actor-filter source comparison and durable contract are covered by `test/timesheets_all_my_filter.integration.test.ts` (3 tests / 18 expectations). The test exercises page/API separation, persisted actor filtering, current-company and empty-fixture guards, manager permission, and file-backed restart.

Authenticated Odoo captures are in `../evidence/timesheets/2026-09-21/timesheet-all-my-filter/`: desktop applies My Timesheets and renders `1-42 / 42` for Mitchell Admin; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile evidence is blocked before authentication because backend `3001/api/modules` did not expose `/api/modules` during the bounded startup probe, with exact output preserved in `core3-readiness.txt`. Print/PDF/action surfaces remain a known blocker and no module sign-off is claimed.
- The repository audit is also blocked before completion by an unrelated page-schema options error; exact output is preserved in `audit-blocker.txt`. No other-owner page was edited.

## Wave 19 execution — `TIMESHEET-ALL-SALES-ORDER-SEARCH-001`

The All Timesheets Sales Order search source comparison and durable contract
are covered by `test/timesheets_all_sales_order_search.integration.test.ts`
(4 tests / 19 expectations). The test exercises the Odoo `order_id` source
field, page/API separation, durable `sales_order_item` search, manager
permission, current-company and empty guards, relation-update freshness, and
file-backed restart persistence.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-all-sales-order-search/`:
desktop applies Sales Order `S00035` and mobile captures responsive Kanban;
`odoo-results.json` records no page/request errors. Core3 desktop/mobile
evidence is blocked by the unrelated shared page-schema error
`components[0].help is not allowed`, with exact output preserved in
`core3-readiness.txt`. Odoo Print/PDF/action surfaces remain a known blocker
and no module sign-off is claimed.

## Wave 20 execution — `TIMESHEET-ALL-NON-BILLABLE-FILTER-001`

The All Timesheets Non-Billable filter source comparison and durable contract
are covered by `test/timesheets_all_non_billable_filter.integration.test.ts`
(4 tests / 20 expectations). The test exercises the Odoo
`timesheet_invoice_type` filter, page/API separation, durable `billing_type`
filtering, manager permission, current-company and empty guards,
relation-update freshness, and file-backed restart persistence.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-all-non-billable-filter/`:
desktop applies Non-Billable and mobile captures responsive Kanban;
`odoo-results.json` records no page/request errors. Core3 desktop/mobile
evidence is blocked by the unrelated shared page-schema error
`components[0].header_actions[6].id references unknown action
"edit_employee_type"`, with exact output preserved in `core3-readiness.txt`.
Odoo Print/PDF/action surfaces remain a known blocker and no module sign-off
is claimed.

## Wave 21 execution — `TIMESHEET-ALL-BILLED-ON-TIMESHEETS-FILTER-001`

The All Timesheets Billed on Timesheets filter source comparison and durable
contract are covered by
`test/timesheets_all_billed_on_timesheets_filter.integration.test.ts`
(4 tests / 21 expectations). The test exercises the Odoo
`timesheet_invoice_type` filter, page/API separation, durable `billing_type`
pivot exposure and filtering, manager permission, current-company and empty
guards, relation-update freshness, and file-backed restart persistence.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-all-billed-on-timesheets-filter/`:
desktop applies Billed on Timesheets and mobile captures responsive Kanban;
`odoo-results.json` records no page/request errors. Core3 desktop/mobile
evidence is blocked because the bounded backend startup did not expose
`127.0.0.1:3001/api/modules`; exact output is preserved in
`core3-readiness.txt`. Odoo Print/PDF/action surfaces remain a known blocker
and no module sign-off is claimed.

## Wave 22 execution — `TIMESHEET-ALL-BILLED-FIXED-PRICE-FILTER-001`

The All Timesheets Billed at a Fixed Price filter source comparison and
durable contract are covered by
`test/timesheets_all_billed_fixed_price_filter.integration.test.ts`
(4 tests / 21 expectations). The test exercises the Odoo
`timesheet_invoice_type` filter, page/API separation, explicit durable
`billing_type` contract and pivot exposure, manager permission,
current-company and empty guards, relation-update freshness, and file-backed
restart persistence.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-all-billed-fixed-price-filter/`:
desktop applies Billed at a Fixed Price and mobile captures responsive Kanban;
`odoo-results.json` records no page/request errors. Core3 desktop/mobile
evidence is blocked because the bounded backend startup did not expose
`127.0.0.1:3001/api/modules`; exact output is preserved in
`core3-readiness.txt`. Odoo Print/PDF/action surfaces remain a known blocker
and no module sign-off is claimed.

The repository UI audit is blocked by the unrelated shared page-schema error
`actions[5].result is not allowed`; exact output is preserved in
`audit-blocker.txt`.

## Wave 23 execution — `TIMESHEET-ALL-BILLED-ON-MILESTONES-FILTER-001`

The All Timesheets Billed on Milestones filter source comparison and durable
contract are covered by
`test/timesheets_all_billed_on_milestones_filter.integration.test.ts`
(4 tests / 21 expectations). The test exercises the Odoo
`timesheet_invoice_type` filter, page/API separation, explicit durable
`billing_type` contract and pivot exposure, manager permission,
current-company and empty guards, relation-update freshness, and file-backed
restart persistence.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-all-billed-on-milestones-filter/`:
desktop applies Billed on Milestones and mobile captures responsive Kanban;
`odoo-results.json` records no page/request errors. Core3 desktop/mobile
evidence is blocked because the bounded backend startup did not expose
`127.0.0.1:3001/api/modules`; exact output is preserved in
`core3-readiness.txt`. Odoo Print/PDF/action surfaces remain a known blocker
and no module sign-off is claimed. The repository audit blocker is recorded in
`audit-blocker.txt`.
