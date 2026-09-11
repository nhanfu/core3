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

The personal-allocation surface is also captured in Core3 at
`/tmp/core3-time-off-my-allocations-{desktop,mobile}.png` and in Odoo at
`/tmp/odoo-time-off/action-222-{desktop,mobile}.png`. Core3 shows the two
current-user allocations, preserves the allocation/status columns on desktop,
stacks the records into readable cards on mobile, and has no horizontal
overflow. The Odoo mobile reference shows the same personal scope with
allocation actions and status badges.

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

## Current batch: dashboard and request workflow

Core3 now exposes `/time-off` as the service-owned dashboard counterpart to
the captured Odoo Time Off dashboard, with balance statistics and a
calendar/list request surface. Deterministic fixtures cover six requests in
Draft, Submitted, Approved, Refused, and Cancelled states. The request list
now supports list, card, and calendar views, bounded search, status filtering,
and request detail navigation. Draft detail shows Submit/Cancel while
Submitted detail shows Approve/Refuse/Cancel through permissioned workflow
actions. Authenticated desktop/mobile checks captured populated dashboard,
request list, and detail states with zero unexpected responses and no
horizontal overflow. Odoo reference captures remain under
`/tmp/odoo-time-off/`; Core3 captures are under `/tmp/core3-time-off-*`.

The configuration/reporting follow-up adds active/archived status filtering and
card/list views to Leave Types, and adds a status list/pivot companion to the
analysis chart. Authenticated desktop/mobile checks verified populated active
and archived fixtures, six lifecycle request aggregates, zero unexpected
responses, and no horizontal overflow. Captures are kept outside Git under
`/tmp/core3-time-off-{desktop,mobile}-{types,analysis}-views.png`.

The management/configuration batch adds fixture-backed Allocations, Accrual
Plans, Public Holidays, and Mandatory Days routes, with corresponding menu
groups and API fragments. Authenticated desktop/mobile checks verified the
Odoo-observed records and columns on all four routes with zero unexpected
responses and no horizontal overflow. Core3 captures are under
`/tmp/core3-time-off-{desktop,mobile}-{allocations,accrual-plans,public-holidays,mandatory-days}-management.png`.

The personal and approval batch adds My Time Off, All Time Off, and Overview
routes with list/card/calendar contracts and service-owned API fragments.
Authenticated desktop/mobile checks verified personal, approval, and team
calendar records with no failed responses or horizontal overflow. A dispatcher
without Time Off permissions receives the expected 403 page-load state. Core3
captures are under `/tmp/core3-time-off-{desktop,mobile}-{my-time-off,approval,overview}-batch.png`.

The management form batch adds permissioned New dialogs for allocations,
accrual plans, public holidays, and mandatory days. The allocation dialog was
exercised on mobile through a successful create mutation after making its
start/end date contract explicit; the resulting fixture remained visible after
refresh with no failed responses or horizontal overflow. Core3 form captures
remain under `/tmp/core3-time-off-mobile-allocation-{new,created}.png`.

The view-navigation batch changes every multi-view Time Off list to visible
text tabs, declares the analysis Pivot fields in its API datasource, and adds
reversed-date validation to new leave requests. Authenticated desktop/mobile
checks covered all twelve current routes and every implemented List, Cards,
Calendar, and Pivot tab with no unexpected failures or horizontal overflow.
The expected invalid-request response is HTTP 400 with the visible
`An active leave type, positive days, and valid dates are required` message;
the dispatcher boundary returns HTTP 403 with the failed-page state. Captures
are `/tmp/core3-time-off-tabs-{desktop,mobile}-{time-off,leave-requests,time-off-analysis}.png`,
plus `/tmp/core3-time-off-mobile-{empty-search,invalid-request,denied}.png`.
The isolated batch was committed as `1c291fba` and integrated as `33b4e777`.

The shared ActivityView batch adds the desktop Activity counterpart to My Time
Off. Its deterministic API slots render the Odoo-observed To-Do, Email, Call,
Meeting, Time Off Approval, Time Off Second Approve, and Document columns,
with state counters, colored cells, record date ranges, empty-cell scheduling,
and the Schedule activity footer. Activity is desktop-only to match Odoo's
responsive behavior: at 1440x900 Core3 and Odoo both render the activity
matrix with no failed requests or document overflow; captures are
`/tmp/core3-my-time-off-activity-desktop-final.png` and
`/tmp/odoo-time-off-desktop-activity-personal.png`. At 390x844 both fall back
to the responsive collection surface with no horizontal overflow; captures
are `/tmp/core3-my-time-off-activity-mobile-final.png` and
`/tmp/odoo-my-time-off-activity-mobile.png`. The implementation was committed
as `5327ecbf`/`d9aa4d8e` and integrated as `712820a5`/`7aeecab3`.

The configuration-form follow-up adds explicit list-to-form routes for Time
Off Types, Accrual Plans, and Public Holidays. Each list keeps its existing
Odoo tabs where applicable, service-owned `page.id` API fragments now provide
searchable fixtures, visible empty states, permissioned row navigation, and
editable OdooFormView detail pages with deterministic 422 validation and 409
uniqueness guards. Authenticated Core3 browser checks at 1440x900 loaded all
three seeded lists and the Time Off Type form; an invalid allocation returned
HTTP 422 without stopping the server, and a valid edit returned HTTP 200 and
persisted. Desktop Activity now visibly matches Odoo's seven columns, with no
`Trip with Family` or `Doctor Appointment`; at 390x844 the Activity URL falls
back to Cards, preserves `scrollWidth === 390`, and has no failed responses.
Captures are `/tmp/core3-time-off-next-types-list-desktop.png`,
`/tmp/core3-time-off-next-type-detail-desktop.png`,
`/tmp/core3-time-off-next-activity-desktop.png`, and
`/tmp/core3-time-off-next-activity-mobile.png`. Focused tests cover the
configuration contracts and exact Activity labels.

The year-calendar visual follow-up closes a concrete Odoo mismatch found in a
fresh authenticated comparison: Odoo's Time Off dashboard uses a twelve-month
year view, while Core3 previously rendered only the first month. The shared
CalendarView now supports an explicit `mode: year` contract with previous/next
year controls and responsive month panels; only the Time Off dashboard opts
into it, so ordinary module calendars retain their month behavior. Desktop and
mobile browser checks assert twelve month panels, eight seeded leave markers,
390px mobile width, and no failed requests. Captures are
`/tmp/core3-time-off-year-desktop.png` and `/tmp/core3-time-off-year-mobile.png`;
they are local evidence only.

The next reporting slice adds `Reporting > By Employee` at
`/time-off-reporting/by-employee`. It follows Odoo's default 2026
`To Approve or Approved` scope and employee > time-off type grouping, with
service-owned pivot/list/graph/calendar data and a read-permission boundary.
The report query remains deterministic over the fixed 2026 fixture dates and
the migration adds its date/state index idempotently. Authenticated desktop and
mobile checks cover the pivot, list, graph, calendar, menu entry, empty search,
and denied permission states with no unexpected requests or horizontal
overflow. Odoo/Core3 captures remain outside Git under
`/tmp/odoo-time-off-report-by-employee-{desktop,mobile}.png` and
`/tmp/core3-time-off-report-by-employee-{desktop,mobile}.png`.

The following reporting slice adds the uncovered installed Odoo action
`action_hr_leave_report` as `Reporting > By Type` at
`/time-off-reporting/by-type`. It is intentionally read-only, matching Odoo's
graph/list/pivot report without create, edit, or delete controls. The report
groups the existing fixed 2026 fixture records by active time-off type and
exposes allocation, time-off, balance, days, and hours measures, with the Odoo
default Submitted/Approved scope, type/status filters, search, empty state,
transport-error state, and `time_off.read` boundary. Its frontend page and
service API are joined by `page.id: time-off-report-by-type`; no Odoo frontend
code or screenshots are committed.

The next reporting slice adds the manager-only installed Odoo server action
`action_hr_holidays_by_employee_and_type_report` as `Reporting > Balance` at
`/time-off-reporting/balance`. It is read-only and uses the existing fixed
2026 employee/type balance fixtures with allocated, taken, planned, remaining,
days, and hours measures. Core3 exposes Graph, List, Pivot, and Calendar tabs
for the shared report surface; Odoo's source action itself is pivot-only, so
the annual Calendar tab is a documented Core3 presentation of the year-window
balance rather than a claim of an Odoo calendar mode. Search, employee/type
filters, empty and transport-error states, and the `time_off.manage` boundary
are service-owned through `page.id: time-off-balance`. Authenticated desktop
and mobile captures and response/overflow checks are kept outside Git.

The Public Holidays configuration slice completes the installed Odoo action
`open_view_public_holiday` at `/public-holidays` with its
`/public-holidays/detail` form counterpart. The service-owned list and detail
API fragments share their matching `page.id` values, use fixed 2026 holiday
fixtures, searchable and period-bounded reads, responsive list/cards, and
explicit empty/transport-error states. Manager-only create, update, and
list-row delete operations validate names and date ranges, reject duplicates
and missing records, and require `row_version` for stale-write protection.
Focused tests cover migration idempotency, source filtering, CRUD,
404/409/422 validation, stale updates and deletes. The source XML was
compared locally; the running `core3_owned` Odoo database does not have
`hr_holidays` installed, so no authenticated live-screen evidence is claimed
for this batch.

The next bounded workflow slice adds the source `hr_leave_allocation_action_my`
surface's “Create a new allocation request” path to `My Allocations`. Core3
adds a permissioned New allocation dialog with the Odoo-shaped title, active
Time Off Type lookup, allocation amount, validity dates, and reasons; the
service-owned insert defaults to the fixed `Admin User` 2026 fixture employee.
The API fragment is joined to the layout by `page.id: my-allocations`, while
the existing allocation detail workflow supplies row-version-protected Submit,
Approve, Refuse, and Cancel transitions. Create guards reject archived or
mismatched types, non-positive amounts, reversed dates, and duplicate titles
with deterministic 422/409 responses. The live `core3_owned` reference was
authenticated successfully against the refreshed `core3_personal` database
with `hr_holidays` installed and demo data available. Batch allocation and
multiple-request wizards remain deferred.

The Mandatory Days follow-up now completes the installed `hr_leave_mandatory_day_action` list/form contract. The layout/API fragments remain joined by `page.id`, and the list now has the Odoo current-year Period filter, search/date scoping, hidden optional department/job columns, row navigation, and manager-only delete. `/mandatory-days/detail` provides the OdooFormView for Name, dates, Color, and Company; create/update/delete are deterministic service mutations with row-version stale protection and 404/409/422 guards. The 0.0.9 migration adds row versions, optional department/job scope fields, and a date index idempotently while preserving the fixed `Company Celebration` fixture. Authenticated personal-Odoo evidence used `/odoo/action-633` (database `core3_personal`) and was captured with empty failed-request lists at 1440x900 and 390x844. Core3 evidence is `/tmp/core3-timeoff-mandatory-days-{desktop,mobile}-{list,detail}.png`; Odoo comparison evidence is `/tmp/odoo-timeoff-personal-{desktop,mobile}-{mandatory-days,mandatory-day-detail}.png`. Final Core3 list/detail browser checks report exact viewport fit and no horizontal overflow; focused Time Off tests pass.

The next uncovered visible `hr_holidays` configuration action is the Accrual
Plan milestone editor reached from `Configuration > Accrual Plans`. The live
personal Odoo menu uses `open_view_accrual_plans` (`/odoo/action-632`, model
`hr.leave.accrual.plan`, `list,form`); its nested milestone actions are
`action_create_accrual_plan_level` (`New Milestone`) and
`action_open_accrual_plan_level` (`Milestone Edition`). The authenticated
reference showed the `Milestones` timeline with `After 1 day(s)`, `After 4
year(s)`, `After 8 year(s)`, and the exact accrual-frequency, carry-over, and
cap sentences.

Core3 implements this bounded slice on
`/time-off/accrual-plans/detail?id=accrual-plan-demo-001` with page contract
`accrual-plan-detail` and the separate API fragment of the same `page.id`.
`accrual_plan_levels` is migration-backed at 0.0.10, seeds the three
deterministic Seniority Plan levels, supports Odoo-shaped search summaries,
and exposes permissioned New Milestone, Milestone Edition, and Delete
actions. Create/edit/delete validate values and duplicate start points,
refresh the parent level count, and use `row_version` stale guards. The
datasource declares an explicit 503 transport state; the list has default,
search, and empty states, while the page and actions require
`time_off.manage`. The supported create form defaults to one Day(s), Daily,
and At allocation creation, matching the Odoo modal's initial values.

Authenticated comparison captures are outside Git under
`/tmp/odoo-time-off-accrual-plans-desktop.png`,
`/tmp/odoo-time-off-accrual-milestones-{desktop,mobile}.png`, and
`/tmp/odoo-time-off-accrual-milestone-new-{desktop,mobile}.png`; Core3
captures are under `/tmp/core3-time-off-accrual-plans-desktop.png`,
`/tmp/core3-time-off-accrual-milestones-{desktop,mobile}.png`,
`/tmp/core3-time-off-accrual-milestone-new-{desktop,mobile}.png`, and
`/tmp/core3-time-off-accrual-milestone-created-desktop.png`. The authenticated
browser run covered menu navigation, populated detail, create/persist, search,
empty search, modal bounds, and desktop/mobile viewport fit with no failed
requests or horizontal overflow. The focused milestone suite passes 3 tests
and 37 assertions.

Known limits: Odoo renders milestones as a custom vertical timeline and its
conditional milestone form has fewer visible controls than the complete
Odoo model. Core3 uses the supported responsive Odoo ListView plus modal form
so row edit/delete, search, empty, and permission boundaries remain
testable; it presents the same visible summary sentences but not Odoo's
timeline connector or every conditional frequency-specific field. The
desktop list search is exercised directly; on mobile the compact toolbar
collapses the text input behind its search button. No mutation was made in
the live Odoo database.

The next uncovered installed visible action is Odoo's `New Group Allocation`
wizard from `Allocations`. The live personal database (`core3_personal`) was
checked at `/odoo/action-631` (`hr_leave_allocation_action_approve_department`);
its visible button opens action 618,
`action_hr_leave_allocation_generate_multi_wizard`. The authenticated desktop
wizard contract is `Grant?`, employee selection, Time Off Type, Regular or
Accrual allocation, validity dates, allocation days, reason, and Allocate Time
Off/Discard. This action was selected directly from the live Time Off menu
inventory; Time Off Types was already covered by the existing configuration
tests.

Core3 implements the bounded manager-only slice at
`/time-off/time-off-allocations`, page/API `page.id: time-off-allocations`.
The responsive ListView exposes `New Group Allocation` in its header and the
service-owned API adds employee, active-type, and active-accrual-plan lookups
plus the `time_off.allocations.group_create` server form. Migration 0.0.11
adds allocation metadata and the deterministic employee fixture table for
Admin User, Marc Demo, Mitchell Admin, and Paul Williams. A successful
submission inserts one `Submitted` allocation per selected employee with the
stable `ALLOC/GROUP/<date>/<employee-id>` name. The focused guards reject an
inactive type, non-positive days or reversed dates, unknown employees, and a
duplicate employee/date submission with deterministic 422/409 responses;
the action and all lookup sources require `time_off.manage`. The focused
suite passes 3 tests with 20 `expect()` calls, including migration
idempotency, deterministic rows, duplicate/invalid-input guards, and the
permission/workflow contract.

Authenticated evidence was captured and visually inspected without mutating
the live Odoo database. Core3 used `admin@tms.local` at 1440x1000 and
390x844; both viewports showed the list and wizard, and both reported
`scrollWidth === viewport width`, with no failed requests or console errors.
Odoo used `codex@core3.local` against `core3_personal`. The desktop reference
shows the group wizard; Odoo's responsive mobile allocation screen hides the
group button and opens the regular allocation form instead. This is recorded
as a known responsive reference difference; Core3 keeps the installed action
reachable on mobile so the bounded action remains usable. The images are
local-only evidence under `/tmp` and are not committed:

- Odoo desktop list: `/tmp/odoo-time-off-group-allocation-desktop-list-final.png`
  SHA-256 `9b2a63f820440ae2d60cd14ab8b027e0fac92262936d13fbf3d10ffd6406f261`
- Odoo desktop group wizard: `/tmp/odoo-time-off-group-allocation-desktop-final.png`
  SHA-256 `0cc323286bd37d82fa255e2e7bb1cbd379eefc6c04346a94e5c690e539033c09`
- Odoo mobile list: `/tmp/odoo-time-off-group-allocation-mobile-list-final.png`
  SHA-256 `925b2311987c1febbf8f66d8d7eb7806584593b4e98c39b2b53a3d2a79bf9221`
- Odoo mobile regular allocation reference: `/tmp/odoo-time-off-group-allocation-mobile-final.png`
  SHA-256 `a101cd6e82f6df8c709d278ba3c07e74a287acd85d15157b0de81f4e69c20758`
- Core3 desktop list: `/tmp/core3-time-off-group-allocation-desktop-list-final.png`
  SHA-256 `5f01f74a1df65e1ee8d3fed1bc73fcffcb50c71b4d3de34974619d8c3b013044`
- Core3 desktop group wizard: `/tmp/core3-time-off-group-allocation-desktop-final.png`
  SHA-256 `3541686dce2d35eac76481192bad4caea1826d75c2629be1f6fd9978e54a90f0`
- Core3 mobile list: `/tmp/core3-time-off-group-allocation-mobile-list-final.png`
  SHA-256 `31bf969e9e474c8e327d57aae67bb8e3c000a0277e963536d477142423769a0e`
- Core3 mobile group wizard: `/tmp/core3-time-off-group-allocation-mobile-final.png`
  SHA-256 `69d013eddc07802a7c7282358bd0b2e0399d42ed509cecc0b7be0da90b43139f`

The implementation/test commits are `02e5aa6b` (`feat(time-off): add group
allocation wizard parity`) and `d152e454` (`fix(time-off): expose group
allocation header action`).

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
