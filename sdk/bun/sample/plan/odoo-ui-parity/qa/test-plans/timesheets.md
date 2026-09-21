# Timesheets detailed QA test plan

Module: timesheets
QA owner: timesheets-qa
Developer owner: timesheets module owner
Reference addon/version: hr_timesheet, Odoo 19 Community
Plan status: approved
Last reviewed: 2026-09-12

This plan follows [`timesheets.md`](../../timesheets.md); executed evidence is
recorded in [`../timesheets.md`](../timesheets.md).

## Wave 27 — `TIMESHEET-MY-IMPORT-TEMPLATE-001`

| Gate | Coverage | Result |
| --- | --- | --- |
| Source/YAML | Odoo `get_import_templates()` comparison; page/API join through `page.id: timesheets`; deterministic client download | pass |
| Persistence | Request-keyed durable download audit, migration replay, idempotent retry, file-backed restart | pass |
| Security/concurrency | `timesheets.write`, active actor/company guard, invalid request guard, stale row-version replay guard | pass |
| Focused regression | `test/timesheets_import_template.integration.test.ts` — 4 tests / 23 expectations | pass |
| Module regression | `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 212 tests / 1318 expectations | pass |
| Static checks | UI audit 733/742/1434; scoped ESLint; Timesheets-owned diff-check | pass |
| Authenticated browser/Odoo pair | Core3 3001 unavailable; Odoo 8069/8073 redirected to `/web/login` | blocked; exact blocker recorded |

This slice is bounded and not module sign-off. The source XLSX asset versus
Core3 CSV output is retained as an explicit parity blocker.

## Wave 28 — `TIMESHEET-MY-FAVORITE-PROJECT-PREFILL-001`

| Gate | Coverage | Result |
| --- | --- | --- |
| Source/YAML | Odoo `_get_favorite_project_id` / `default_get`; page/API join through `page.id: timesheets`; source-prefilled New Timesheet | pass |
| Persistence | Favorite derived from durable recent entries; migration replay and file-backed restart | pass |
| Security/scope | `timesheets.write`; current employee/company; active timesheetable project; empty guard | pass |
| Focused regression | `test/timesheets_favorite_project_prefill.integration.test.ts` — 3 tests / 17 expectations | pass |
| Module regression | `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 215 tests / 1335 expectations across 57 files | pass |
| Static checks | UI audit 735/744/1440; scoped ESLint; Timesheets-owned diff-check | pass |
| Authenticated browser/Odoo pair | Core3 3001 unavailable; Odoo 8069/8073 redirected to `/web/login` | blocked; exact blocker recorded |

This slice is bounded and not module sign-off. Existing Odoo Print/PDF/action
parity blockers remain open.

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

## Wave 24 execution — `TIMESHEET-ALL-BILLED-MANUALLY-FILTER-001`

The All Timesheets Billed Manually filter source comparison and durable
contract are covered by
`test/timesheets_all_billed_manually_filter.integration.test.ts`
(4 tests / 21 expectations). The test exercises the Odoo
`timesheet_invoice_type` filter, page/API separation, explicit durable
`billing_type` contract and pivot exposure, manager permission,
current-company and empty guards, relation-update freshness, and file-backed
restart persistence.

Authenticated Odoo captures are in
`../evidence/timesheets/2026-09-21/timesheet-all-billed-manually-filter/`:
desktop applies Billed Manually and mobile captures responsive Kanban;
`odoo-results.json` records no page/request errors. Core3 desktop/mobile
evidence is blocked because the bounded backend startup did not expose
`127.0.0.1:3001/api/modules`; exact output is preserved in
`core3-readiness.txt`. Odoo Print/PDF/action surfaces remain a known blocker
and no module sign-off is claimed. The repository UI audit passed with 726
pages, 735 routes, and 1,409 datasources.

## Wave 25 — `TIMESHEET-SALES-ORDER-ITEM-ACTION-001`

| Check | Expected evidence | Result |
| --- | --- | --- |
| Odoo source/action comparison | `timesheet_action_from_sales_order_item`, `so_line = active_id`, billable and week defaults | pass in focused source test |
| Paired YAML contract | page/API both declare `sales-order-item-timesheets` | pass |
| Durable scoped read | persisted sales-order item relation and billable/current-week context | pass |
| Permission/company/empty/missing relation | manager permission and fail-closed query guards | pass |
| Freshness/restart | changed relation is visible and file-backed migration reopens it | pass |
| Focused regression | new test 4/4; All Timesheets 54/54 | pass |
| Audit/lint/diff | UI audit 729/738/1419; ESLint; `git diff --check` | pass |
| Authenticated desktop/mobile evidence | Core3 and Odoo captures | blocked; exact runtime blockers recorded, no sign-off |

## Wave 40 — `TIMESHEET-TASK-ACTION-GRAPH-VIEW-001`

- Source: `hr_timesheet/models/project_task.py`,
  `action_view_subtask_timesheet` replaces the graph view with
  `hr_timesheet.view_hr_timesheet_line_graph_by_employee`.
- Core3: `task-timesheets` page/API retains the `page.id` binding; the page
  adds a desktop-only Graph tab using employee categories and hours measure,
  while the API's durable task entry source supplies graph-ready fields.
- Persistence/security: migration `20260921180000-023-timesheets-task-action-graph.yaml`
  adds the task graph lookup index; source rows remain current-company and
  `timesheets.read` scoped with missing, empty, and descendant guards.
- Focused test:
  `test/timesheets_task_action_graph_view.integration.test.ts` — 4/4 tests,
  19 expectations. Related task regression — 30/30 tests, 170 expectations.
- Restart: file-backed DuckDB close/reopen with migration replay.
- Static gates: scoped ESLint passed; UI audit passed at 755 pages / 764
  routes / 1,528 datasources; staged Timesheets diff-check recorded before
  commit.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. No authenticated desktop/mobile
  evidence or sign-off is claimed. Exact blockers are in the feature evidence
  directory.

## Wave 39 — `TIMESHEET-TASK-ACTION-PROJECT-CONTEXT-001`

- Source: `hr_timesheet/models/project_task.py`,
  `action_view_subtask_timesheet`, descendant task scope, and
  `default_project_id: self.project_id.id`.
- Core3: `task-timesheets` page/API accepts the task context and exposes
  `task_timesheet_entry_defaults`; the create form uses `prefill: source` and
  keeps the layout-only page/API split joined by `page.id`.
- Persistence/security: durable task/project relations are current-company
  scoped; the migration adds the context lookup index; create canonicalizes
  task/project values and rejects stale context, mismatched project, missing,
  closed, and foreign-company selections.
- Focused test:
  `test/timesheets_task_action_project_context.integration.test.ts` — 4/4
  tests, 23 expectations. Related task regression — 26/26 tests, 151
  expectations.
- Restart: file-backed DuckDB close/reopen with migration replay.
- Static gates: scoped ESLint passed; UI audit passed at 754 pages / 763
  routes / 1,523 datasources; staged Timesheets diff-check recorded before
  commit.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. No authenticated desktop/mobile
  evidence or sign-off is claimed. Exact blockers are in the feature evidence
  directory.

## Wave 38 — `TIMESHEET-TASK-ACTION-MULTI-SCOPE-001`

- Source: `hr_timesheet/views/hr_timesheet_views.xml`,
  `timesheet_action_task`, domain `task_id in active_ids`, context
  `is_timesheet: 1`.
- Core3: the existing `task-timesheets` page/API pair accepts multi-task
  `task_ids`, exposes `task_timesheet_scope`, and preserves exact single-task
  and optional descendant behavior.
- Persistence/security: durable task and entry relations are current-company
  scoped; create requires selected-task membership and rejects missing, stale,
  closed, and foreign-company context.
- Focused test:
  `test/timesheets_task_action_multi_scope.integration.test.ts` — 4/4 tests,
  22 expectations. Related task regression — 18/18 tests, 105 expectations.
- Restart: file-backed DuckDB close/reopen with existing migrations and a
  created multi-context row.
- Static gates: scoped ESLint passed; UI audit passed at 753 pages / 762
  routes / 1,519 datasources; staged Timesheets diff-check passed.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. No authenticated desktop/mobile
  evidence or sign-off is claimed. Exact blockers are in the feature evidence
  directory.

## Wave 37 — `TIMESHEET-TASK-ACTION-DISPLAY-NAME-001`

- Source: `hr_timesheet/views/hr_timesheet_views.xml`,
  `timesheet_action_task`.
- Source action: `Task's Timesheets`, model `account.analytic.line`, task
  `active_ids` domain, Timesheets context flag.
- Core3 pair: `pages/task-timesheets.yaml` and
  `api/task-timesheets.yaml`, joined by `page.id`.
- API source: `task_timesheet_action_context`, derived from durable
  `timesheet_tasks`, permission `timesheets.read`.
- Guards: current company, missing task, empty fixture, and read permission.
- Focused test: `test/timesheets_task_action_display_name.integration.test.ts`
  — 3 tests / 17 expectations.
- Related task regression: 14 tests / 83 expectations.
- Restart: file-backed DuckDB close/reopen with migration replay.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. No authenticated desktop/mobile
  evidence or sign-off is claimed.

## Wave 36 — `TIMESHEET-PROJECT-ACTION-DISPLAY-NAME-001`

- Source: `hr_timesheet/models/project_project.py` `action_project_timesheets`.
- Standalone action label: `<Project>'s Timesheets`.
- Embedded action context: `from_embedded_action` preserves generic `Timesheets`.
- Core3 pair: `pages/project-timesheets.yaml` and
  `api/project-timesheets.yaml`, joined by `page.id`.
- API source: `project_timesheet_action_context`, derived from durable
  `timesheet_projects`, permission `timesheets.read`.
- Guards: current company, active project, timesheetable project, analytic
  account, empty fixture, and missing project.
- Focused test: `test/timesheets_project_action_display_name.integration.test.ts`
  — 3 tests / 18 expectations.
- Restart: file-backed DuckDB close/reopen with migration replay.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. No authenticated desktop/mobile
  evidence or sign-off is claimed.

## Wave 35 — `TIMESHEET-PROJECT-ACTION-MULTI-SCOPE-001`

- Source: `hr_timesheet/views/hr_timesheet_views.xml`,
  `timesheet_action_project`, domain `project_id in active_ids`, context
  `is_timesheet: 1`.
- Core3: project page remains layout-only; API accepts `project_ids`, exposes a
  durable `project_timesheet_scope` aggregate, and guards selected project
  membership, company, active state, timesheetability, and analytic account.
- Focused test: `test/timesheets_project_multi_scope.integration.test.ts`,
  4/4 tests and 21 expectations.
- Required restart/permission/empty/stale checks are covered in the same
  suite. Browser capture is required when Core3 and authenticated Odoo are
  available; current exact blockers are in the feature evidence directory.

## Wave 34 — `TIMESHEET-PROJECT-CONTEXT-DEFAULT-001`

- Source gate: `hr_timesheet/models/project_project.py` `action_project_timesheets`; `hr_timesheet/views/hr_timesheet_views.xml` `act_hr_timesheet_line_by_project` uses `project_id = active_id` and `default_project_id = active_id`.
- Contract gate: `project-timesheets` page/API pair exposes `project_timesheet_entry_defaults` and source-prefills the project create form.
- Persistence/security gate: the create path canonicalizes the durable project relation, writes the active company, requires `timesheets.write`, and rejects stale project context, foreign company, inactive/non-timesheetable projects, and missing analytic accounts.
- Focused gate: `bun test test/timesheets_project_context_default.integration.test.ts --timeout 20000` — 4 passed / 21 expectations.
- Regression/static gates: related project report/dashboard/dependency data tests 18 passed / 101 expectations; ESLint passed; Timesheets-owned `git diff --check` passed. Full Timesheets and UI audit are blocked by the shared `discoverPages()` `SyntaxError: YAML Parse error: Unexpected token` in concurrent non-Timesheets work.
- Browser gate: blocked. Core3 `/api/modules` and `/project-timesheets` refused port 3001; Odoo 8069/8073 returned HTTP 200 only for `/web/login`. Exact probe and comparison notes are under `evidence/timesheets/2026-09-21/timesheet-project-context-default-001/`; no authenticated desktop/mobile sign-off is claimed.
- Odoo Print/PDF/action surfaces remain blockers; no module sign-off is claimed.

## Wave 33 — `TIMESHEET-EMPLOYEE-CONTEXT-DEFAULT-001`

- Source gate: `hr_timesheet/views/hr_timesheet_views.xml` employee action uses `('employee_id', '=', active_id)` and `default_employee_id: active_id`.
- Contract gate: `employee-timesheets` page/API pair exposes `employee_timesheet_entry_defaults` and source-prefills the employee create form.
- Persistence/security gate: the create path canonicalizes the durable employee relation, writes the active company, requires `timesheets.write`, and rejects stale employee context, foreign company, inactive employee, and invalid project values.
- Focused gate: `bun test test/timesheets_employee_context_default.integration.test.ts --timeout 20000` — 4 passed / 18 expectations.
- Regression/static gates: related employee/project/task tests 17 passed / 100 expectations; full Timesheets 235 passed / 1,445 expectations; ESLint passed; UI audit passed with 746/755/1,483; `git diff --check` passed.
- Browser gate: blocked. Core3 `/api/modules` and `/employee-timesheets` refused port 3001; Odoo 8069/8073 returned HTTP 200 only for `/web/login`. Exact probe and comparison notes are under `evidence/timesheets/2026-09-21/timesheet-employee-context-default-001/`; no authenticated desktop/mobile sign-off is claimed.
- Odoo Print/PDF/action surfaces remain blockers; no module sign-off is claimed.

## Wave 32 — `TIMESHEET-TASK-SUBTASK-SCOPE-001`

| Check | Expected evidence | Result |
| --- | --- | --- |
| Odoo task action comparison | `action_view_subtask_timesheet`, descendant task IDs, `task_id in task_ids` | pass in focused source test |
| Paired YAML contract | `page.id: task-timesheets`, Include sub-tasks filter, API expansion predicate | pass |
| Durable hierarchy | persisted child task relation and deterministic child timesheet row | pass |
| Permission/company/empty guards | `timesheets.read`, current company, empty fixture, missing task | pass |
| Exact versus expanded scope | absent context stays exact; `include_subtasks=true` includes child work | pass |
| Freshness/restart | relation change, migration replay, and file-backed restart | pass |
| Focused/full regression | new test 4/4; full Timesheets 231/231 | pass |
| Audit/lint/diff | UI audit 743/752/1473; ESLint; `git diff --check` | pass |
| Authenticated desktop/mobile evidence | Core3 and paired Odoo route/action capture | blocked; exact runtime blockers recorded, no sign-off |

## Wave 31 — `TIMESHEET-DEPARTMENT-REPORT-CONTEXT-001`

| Check | Expected evidence | Result |
| --- | --- | --- |
| Odoo Department action comparison | `act_hr_timesheet_report`, `search_default_department_id`, `default_department_id` | pass in focused source test |
| Paired YAML contract | `page.id: timesheets-by-employee`, Department filter, API options source | pass |
| Durable department context | persisted employee department relation and filtered report rows | pass |
| Permission/company/empty guards | `timesheets.manage`, current company, missing department, empty fixture | pass |
| Freshness/restart | relation update, migration replay, and file-backed restart | pass |
| Focused/full regression | new test 4/4; full Timesheets 227/227 | pass |
| Audit/lint/diff | audit blocked by unrelated eCommerce schema; ESLint and scoped `git diff --check` pass | partial; blocker recorded |
| Authenticated desktop/mobile evidence | Core3 and paired Odoo route/action capture | blocked; exact runtime blockers recorded, no sign-off |

## Wave 30 — `TIMESHEET-MY-CALENDAR-DISPLAY-NAME-001`

| Check | Expected evidence | Result |
| --- | --- | --- |
| Odoo source/calendar comparison | `_compute_calendar_display_name` and `create_name_field` | pass in focused source test |
| Paired YAML contract | `page.id: timesheets` and API calendar projection | pass |
| Durable encoded label | persisted entry hours plus company settings produce hour/day labels | pass |
| Permission/company/empty guards | `timesheets.read`, actor scope, current company, empty fixture | pass |
| Freshness/restart | calendar labels survive migration replay and file-backed reopen | pass |
| Focused regression | new test 4/4; relevant regression 11/11 | pass |
| Audit/lint/diff | UI audit 737/746/1450; ESLint; `git diff --check` | pass |
| Authenticated desktop/mobile evidence | Core3 and Odoo captures | blocked; exact runtime blockers recorded, no sign-off |

## Wave 29 — `TIMESHEET-MY-PROJECT-TASK-DEPENDENCY-001`

| Check | Expected evidence | Result |
| --- | --- | --- |
| Odoo source/context comparison | `_onchange_project_id`, `default_project_id`, open-task search context | pass in focused source test |
| Paired YAML contract | `page.id: timesheets` plus API project/task datasources | pass |
| Durable project/task dependency | persisted active project and open task relations; valid task name canonicalization | pass |
| Permission/company/empty/stale guards | `timesheets.write`, current-company options, empty fixture, and cross-project/closed task rejection | pass |
| Freshness/restart | file-backed option query and mutation behavior survives reopen | pass |
| Focused regression | new test 4/4; full Timesheets 219/219 | pass |
| Audit/lint/diff | UI audit 737/746/1449; ESLint; `git diff --check` | pass |
| Authenticated desktop/mobile evidence | Core3 and Odoo captures | blocked; exact runtime blockers recorded, no sign-off |

## Wave 26 — `TIMESHEET-ALL-BILLING-TYPE-GROUP-001`

| Check | Expected evidence | Result |
| --- | --- | --- |
| Odoo source/action comparison | `groupby_timesheet_invoice_type`, Billing Type, `timesheet_invoice_type` | pass in focused source test |
| Paired YAML contract | All Timesheets page group-by and API `group_by_contracts` | pass |
| Durable grouping | persisted `timesheet_entries.billing_type` counts and pivot projection | pass |
| Permission/company/empty guards | manager permission and current-company/empty reads | pass |
| Freshness/restart | changed billing type is visible and restart preserves groups | pass |
| Focused regression | new test 4/4; All Timesheets 58/58 | pass |
| Audit/lint/diff | UI audit 729/738/1419; ESLint; `git diff --check` | pass |
| Authenticated desktop/mobile evidence | Core3 and Odoo captures | blocked; exact runtime blockers recorded, no sign-off |

## Wave 41 — `TIMESHEET-TASK-ACTION-KANBAN-VIEW-001`

- Source/action: `project.task.action_view_subtask_timesheet`, including the
  internal-user branch that preserves the `kanban` view.
- Page contract: `pages/task-timesheets.yaml` stays layout-only and adds a
  responsive employee-grouped Kanban view with task, date, time-spent, and
  status card fields.
- API contract: `api/task-timesheets.yaml` remains separate and is joined by
  `page.id: task-timesheets`; durable `task_timesheet_entries` supplies the
  projection and existing `timesheets.read`, company, missing, empty, stale,
  and guarded mutation boundaries.
- Migration: `20260921190000-024-timesheets-task-action-kanban.yaml`, replay-safe
  task/company/employee/state/date lookup index.
- Focused test:
  `test/timesheets_task_action_kanban_view.integration.test.ts` — 4 tests / 17
  expectations, including durable create and file-backed restart.
- Related regression: task/action/report suites — 34 tests / 187 expectations.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. Authenticated desktop/mobile
  evidence is blocked; exact probes are in the feature evidence directory.

## Wave 43 — `TIMESHEET-TASK-ACTION-PIVOT-VIEW-001`

- Source/action: `timesheet_action_all` supplies the source pivot and
  `project.task.action_view_subtask_timesheet` retains it for internal users
  while applying task/subtask scope.
- Page contract: `pages/task-timesheets.yaml` stays layout-only and adds a
  desktop-only Pivot with employee rows, work-date columns, weekly ranges,
  Time Spent, and Timesheet Costs measures.
- API contract: `api/task-timesheets.yaml` remains separate and joins by
  `page.id: task-timesheets`; `task_timesheet_entries` exposes durable
  `hours` and `cost` fields with existing permission, company, missing, empty,
  stale, and guarded mutation boundaries.
- Migration: `20260921192000-026-timesheets-task-action-pivot.yaml`, replay-safe
  task/company/employee/date/unit-cost lookup index.
- Focused test:
  `test/timesheets_task_action_pivot_view.integration.test.ts` — 4 tests / 22
  expectations, including cost, stale edit, and file-backed restart.
- Related regression: task/action/report suites — 42 tests / 230 expectations.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. Authenticated desktop/mobile
  evidence is blocked; exact probes are in the feature evidence directory.

## Wave 42 — `TIMESHEET-TASK-ACTION-CALENDAR-VIEW-001`

- Source/action: `timesheet_action_all` declares Calendar and
  `project.task.action_view_subtask_timesheet` retains it for internal users
  while applying task/subtask scope.
- Page contract: `pages/task-timesheets.yaml` stays layout-only and adds a
  Calendar view keyed by `work_date`, with durable label, employee, task,
  description, and time-spent card fields.
- API contract: `api/task-timesheets.yaml` remains separate and joins by
  `page.id: task-timesheets`; `task_timesheet_entries` exposes the durable
  `calendar_display_name` projection with existing permission, company,
  missing, empty, stale, and guarded mutation boundaries.
- Migration: `20260921191000-025-timesheets-task-action-calendar.yaml`,
  replay-safe task/company/date/employee lookup index.
- Focused test:
  `test/timesheets_task_action_calendar_view.integration.test.ts` — 4 tests /
  21 expectations, including stale edit and file-backed restart.
- Related regression: 37 passing tests / 198 expectations; one discovery
  assertion is blocked by unrelated duplicate Employees datasource
  `employee_language_options`.
- Browser gate: Core3 port 3001 refused connections; Odoo 8069/8073 returned
  the unauthenticated `/web/login` boundary. Authenticated desktop/mobile
  evidence is blocked; exact probes are in the feature evidence directory.
