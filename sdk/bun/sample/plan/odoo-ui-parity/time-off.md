# Time Off UI parity

Status: ready

This plan records the complete source contract for Odoo 19 Community
`hr_holidays`. The live-reference gate is now satisfied in a disposable
authenticated database; implementation proceeds in the isolated Time Off
worktree and must remain YAML-first with no copied Odoo frontend code.

## Gate 1: addon, version, and demo data

- Source: `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd` (requested revision
  `65975996`).
- Addon: `/home/nhanjs/projects/odoo/addons/hr_holidays`.
- Manifest: addon name `Time Off`, version `1.6`, category
  `Human Resources/Time Off`, `installable: True`, `application: True`.
- Dependencies: `hr`, `calendar`, and `resource`.
- Official demo data is declared by `data/hr_holidays_demo.xml`. The manifest
  also loads official base data for leave types, attachments/icons, cron jobs,
  security, tours, reports, wizards, resource/calendar integration, and mail
  activity/subtype definitions. Core3 must model the visible semantic records,
  not copy Odoo frontend code or use the non-deterministic demo date helpers.
- The primary live database is `core3_demo` at `http://localhost:8069`.
  A disposable reference database `core3_timeoff_demo` was initialized from
  the same Odoo 19 image with `--without-demo=False`; `ir.module.module`
  reports `name=hr_holidays`, `state=installed`, and `installed_version=19.0.1.6`.
  The disposable administrator is `admin` / `TimeOffDemo2026!` and is used only
  for local reference capture.

## Gate 2: visible menus, actions, routes, and views

Odoo `path` values are web-client action aliases, not HTTP controller routes.
Actions without a path are modal, embedded, or context actions and need an
explicit Core3 destination or an owning-surface drilldown.

### Menu tree and visibility

The root `Time Off` menu (`menu_hr_holidays_root`) is available to
`base.group_user`.

- `My Time`
  - unnamed `Dashboard` / `hr_leave_action_new_request` (`time-off`)
  - `My Time Off` / `hr_leave_action_my` (`my-time-off`)
  - `My Allocations` / `hr_leave_allocation_action_my`
- `Overview` / `action_hr_holidays_dashboard` (`time-off-overview`), all
  active employees, current year, team, approved and validated defaults.
- `Management`, visible to `hr_holidays.group_hr_holidays_responsible`
  - `Time Off` / `hr_leave_action_action_approve_department`
    (`time-off-approval`)
  - `Allocations` / `hr_leave_allocation_action_approve_department`
- `Reporting`, visible to `hr_holidays.group_hr_holidays_user`
  - `by Employee` / `action_hr_available_holidays_report`
  - `by Type` / `action_hr_leave_report`
  - `Balance` / `action_hr_holidays_by_employee_and_type_report`, manager-only
    (`hr_holidays.group_hr_holidays_manager`)
- `Configuration`, manager-only (`hr_holidays.group_hr_holidays_manager`)
  - `Time Off Types` / `open_view_holiday_status`
  - `Accrual Plans` / `open_view_accrual_plans`
  - `Public Holidays` / `open_view_public_holiday`
  - `Mandatory Days` / `hr_leave_mandatory_day_action`
  - hidden technical `Activity Types` /
    `mail_activity_type_action_config_hr_holidays`, `base.group_no_one`; do
    not expose this in ordinary parity navigation.

### Window actions, paths, modes, and contracts

| Surface | XML action and model | Path / modes | Contract |
| --- | --- | --- | --- |
| Dashboard / new request | `hr_leave_action_new_request`, `hr.leave` | `/odoo/time-off`; calendar, list, form, activity | current user's company-scoped requests; year filter; request creation |
| My Time Off | `hr_leave_action_my`, `hr.leave` | `/odoo/my-time-off`; list, form, kanban, activity | current user's requests; list is primary and personal kanban is available |
| Request modal | `hr_leave_action_my_request`, `hr.leave` | modal form | new time-off form from dashboard; dashboard-specific form variants |
| All Time Off / approval | `hr_leave_action_action_approve_department`, `hr.leave` | `/odoo/time-off-approval`; kanban, list, form, calendar, activity | manager waiting-for-me/team/current-year defaults; company scope |
| All Time Off context action | `hr_leave_action_holiday_allocation_id`, `hr.leave` | no path; list, kanban, form, calendar, activity | context-scoped all records; preserve owning integration |
| Overview | `action_hr_holidays_dashboard`, `hr.leave.report.calendar` | `/odoo/time-off-overview`; calendar | team/current-year approved/validated calendar, active employees |
| Dashboard calendar modal | `action_my_days_off_dashboard_calendar` | modal calendar | personal yearly calendar and empty help state |
| My Allocations | `hr_leave_allocation_action_my`, `hr.leave.allocation` | list, kanban, form, activity | current employee, current year, employee-allocation context |
| All Allocations | `hr_leave_allocation_action_all`, `hr.leave.allocation` | list, kanban, form, activity | all allocation records; manager context |
| New allocation | `hr_leave_allocation_action_form` | modal form | manager allocation form |
| Allocation approval | `hr_leave_allocation_action_approve_department` | kanban, list, form, activity | team and approval defaults |
| Group allocation | `action_hr_leave_allocation_generate_multi_wizard` | modal form | employee/department allocation generation; `Allocate Time Off` / `Discard` |
| Multiple requests | `action_hr_leave_generate_multi_wizard` | modal form | batch time-off generation; `Generate Time Off` / `Discard` |
| Time Off Types | `open_view_holiday_status`, `hr.leave.type` | list, kanban, form | active/archive, color/icon, allocation, approval and company settings |
| Accrual Plans | `open_view_accrual_plans`, `hr.leave.accrual.plan` | list, form | plan levels, accrual rules, active/archive, company |
| Public Holidays | `open_view_public_holiday`, `resource.calendar.leaves` | list, form | date/name/calendar; date default filter |
| Mandatory Days | `hr_leave_mandatory_day_action`, `hr.leave.mandatory.day` | list, form | date-filtered mandatory leave rules |
| Time Off by Employee | `action_hr_available_holidays_report`, `hr.leave` | list, graph, pivot, calendar, form | date, employee, type, to-approve/validated defaults; state not cancelled |
| Time Off by Type | `action_hr_leave_report`, `hr.leave.report` | graph, list, pivot | grouped type; approved/validated defaults |
| Time Off Analysis | `hr_leave_report_action`, `hr.leave.report` | graph, pivot | department context; employee/type grouping; monthly date grouping |
| Balance | `action_hr_holidays_by_employee_and_type_report` | server action to employee/type pivot | employee × leave type; days and hours measures |
| Time Off Summary report | `action_report_holidayssummary` | QWeb PDF report | allocation summary; paper format `paperformat_hrsummary` |
| Activity Types | `mail_activity_type_action_config_hr_holidays` | list, kanban, form | hidden technical action; not ordinary navigation |
| Absent Employees integration | `hr_employee_action_from_department`, `hr.employee` | list, kanban, form | department-scoped employees absent on time off; preserve HR drilldown |
| Calendar public-holiday context | `resource_calendar_leaves_view_search_inherit` action | list | calendar-scoped public holidays; preserve calendar owner context |

### View and state contract

The source view IDs are `hr_leave_view_dashboard`,
`hr_leave_employee_view_dashboard`, `hr_leave_view_calendar`,
`hr_leave_view_tree`, `hr_leave_view_tree_my`, `hr_leave_view_kanban`,
`hr_leave_view_kanban_my`, `hr_leave_view_activity`, `hr_leave_view_form`,
`hr_leave_view_form_manager`, and dashboard/new-request form variants.
Search variants are `hr_leave_view_search_my`,
`hr_leave_view_search_manager`, and `hr_leave_view_search_report`.

Leave list, kanban, calendar, activity, and form states must cover draft,
submitted/to-approve, approved/validated, refused, cancelled, and manager
approval status transitions. Form fields include employee, time-off type,
duration in days/hours, start/end date/time, description, department/company,
approver, supporting attachment, and chatter/activity where inherited. Actions
include New, Submit, Approve, Refuse, Cancel, Validate, Confirm, Reset to
Draft, Refuse with reason, and report/summary actions as permitted by state and
group. The calendar supports date navigation, event creation, team visibility,
and all-day/time-duration rendering. Activity shows scheduled/due activities.

Allocation views cover requested/confirmed/approved/refused/cancelled states,
employee/type/duration/dates/reason/company, individual and group allocation,
approval, and reset/refuse/cancel transitions. Type views cover list/kanban/form
and archived records. Accrual plan views cover plan level configuration and
active/archive. Public holiday and mandatory-day views cover list/form,
date-filtered search, calendar, and company/calendar scope.

Search/filter/group contracts include My Time Off, My Team, Waiting for Me,
To Approve, Approved, Validated, Refused, Cancelled, Current Year, date ranges,
employee, department, company, time-off type, and group-by employee,
department, type, state, and month/year. Reports must support the source
measures days and hours and graph/list/pivot/calendar switching.

## Gate 3: routes and truthful Odoo desktop/mobile evidence

Required capture dimensions are desktop `1440x900` and mobile `390x844` with
touch emulation. An installed reference must be loaded through authenticated
menu navigation, then assert title, menu/action, records, route, and no
unexpected failed requests before capture.

Authenticated navigation was captured from the Time Off menu in the disposable
`core3_timeoff_demo` database using `admin`, at desktop `1440x900` and mobile
`390x844` with touch emulation. Dashboard captures show real balances,
pending requests, and calendar events. Additional desktop captures cover My
Time Off, My Allocations, approval, overview, employee/type/balance reports,
Time Off Types, Accrual Plans, Public Holidays, and Mandatory Days. Every
capture had an empty failed-request list. Files are under
`/tmp/odoo-time-off/`; the dashboard pair is
`/tmp/odoo-time-off-{desktop,mobile}-dashboard.png`.

## Gate 4: deterministic Core3 datasource and fixture requirements

The existing service is `sdk/bun/sample/services/time_off` with DuckDB storage,
permissions `time_off.read`, `time_off.write`, and `time_off.manage`, and pages
for requests, request detail, types, analysis, and workflow. Existing pages
currently query `leave_requests`, `leave_types`, and balances directly. Before
implementation, move screen reads and mutations to convention-discovered
`services/time_off/api/*.yaml` fragments keyed by `page.id`; keep page YAML
layout-only and do not place API fragments in a frontend `pages:` manifest.
The existing `/leave-requests`, `/leave-types`, and `/time-off-analysis` aliases
must remain stable while adding explicit parity routes.

Use stable IDs and fixed seed date `2026-01-15`. Never use `CURRENT_DATE`,
random IDs, browser-only fixtures, remote images, or live Odoo calls. Prove
fresh install, restart, upgrade, idempotent seed, and demo-on/demo-off behavior
for DuckDB and supported adapters. The register references a shared
`screen-mock-data.md` contract; this worktree has no such file at the expected
path, so its required principles are restated here and must be reconciled with
the shared contract before implementation.

Fixture/API records must include multiple employees, departments, companies,
leave types, active/archived types, allocations, accrual plans, public holidays,
mandatory days, and requests covering draft/submitted/approved/refused/
cancelled, half-day/hour and multi-day durations, year boundaries, overlapping
dates, manager/team scope, attachments/activity metadata, and empty scoped
results. Preserve Odoo-semantic demo names and icons locally where visible.

Required service-owned operations include request/allocation/type/accrual/
holiday/mandatory CRUD, batch allocation and batch request generation, search,
filters, groupings, pagination, calendar ranges, graph/pivot aggregates,
report/PDF intent, submit/approve/refuse/cancel/reset/validate transitions,
balance calculation, employee absence drilldown, and activity/attachment
links. Cross-service employee/company/calendar reads use declared
`yaml.service.<id>` calls, not direct SQL into isolated service databases.

Guards must return deterministic `401`, `403`, `404`, `409`, and `422` responses
for unauthenticated, denied, missing, stale-row, overlap, invalid-date,
invalid-duration, missing-balance, company-scope, archived-type, and invalid
transition cases. Include row versions and explicit permission behavior for
ordinary employee, time-off user, responsible/approver, manager, and system
administrator personas.

## Gate 5: shared UI primitives

Reuse and verify existing generic contracts before adding Time Off-specific
code: Odoo-variant `ListView` with search/filter/group/pager/optional columns,
responsive cards and bulk actions; `OdooFormView` with statusbar, field groups,
modal forms and validation; Kanban; CalendarView; ActivityView; Graph/Chart;
PivotView; StatRow; StatusChip; date-range and duration controls; many2one and
multi-select relation fields; action menus; attachments/chatter/activity;
permission/access-denied; loading, empty, error, not-found, conflict and
validation states; and mobile content-only scrolling with no horizontal
overflow. Calendar event cards, hours/days duration input, report measures,
status transitions, group allocation, and employee/type selectors are generic
primitive contracts if absent, not bespoke Time Off widgets.

## Gate 6: acceptance checks

### Source and navigation

- Every source menu above maps to an explicit Core3 route, modal, context
  drilldown, or deliberate documented redirect; no hidden technical action is
  accidentally exposed.
- Authenticated navigation starts at the Core3 Time Off menu and exercises each
  enabled route at both viewports. Direct URLs alone do not sign off.
- Ordinary employee, time-off user, responsible/approver, manager, and system
  visibility matches the source group boundaries, including menu, field,
  button, record-rule, and company scope.

### Functional and data

- Stable fixture ordering and fixed relative dates render identically after
  restart; fresh install and upgrade are idempotent.
- Exercise list/form/kanban/calendar/activity/graph/pivot switching, search,
  date filters, grouping, pagination, optional columns, create/edit, bulk
  operations, drilldowns, batch wizards, report measures, and empty states.
- Exercise valid transitions and invalid transitions, overlapping dates,
  insufficient balance, archived type, missing employee/type, stale row, and
  permission denial; assert the exact user-visible error and API status.
- Verify days/hours duration, balance/used/remaining totals, current-year and
  team defaults, company/department scoping, absence drilldown, attachment and
  activity affordances, and report grouping.
- Assert explicit loading, server-error, empty, 401/403, 404, 409, and 422
  states without console errors or unexpected datasource failures.

### Visual and mobile

- For each loaded authenticated reference and Core3 implementation state,
  assert title, menu selection, route, records/empty copy, visible action
  affordances, and no unexpected failed requests before saving images under
  `/tmp/odoo-time-off/`; never commit images.
- Compare desktop and mobile list, form, calendar, kanban, report, modal,
  empty, validation, denied, and error states. Mobile controls remain usable,
  long employee/type names wrap safely, dialogs fit, and `scrollWidth` does not
  exceed the content viewport.
- Run focused Time Off YAML/API/migration/browser checks, then `git diff --check`.
  All six gates now have written evidence; the installed disposable reference
  satisfies the former live-addon prerequisite and this plan is `ready`.
