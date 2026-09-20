# timesheets parity progress

Module owner: timesheets module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Timesheets suite passes 49 tests across 14 files with 396
assertions. The initial authenticated matrix covered 13 routes at desktop and
mobile; an isolated fresh-page rerun now passes 26/26 route checks with valid
detail IDs and no page/request errors or horizontal overflow. Timesheet Analysis
exposed a missing API pivot declaration, which was fixed by adding `pivot.fields`
and reverified with authenticated Pivot/Graph/List rendering without failures. A fresh authenticated mutation smoke also completed
Draft -> Submitted -> Approved, with approval dispatching the Project-owned
hours mutation after assigning its cross-module inputs from the submitted row.
Role-boundary smoke also confirms that Fleet is denied personal, all-timesheets,
settings, and approval endpoints with the expected 403 permission errors.
Authenticated Admin create -> edit -> delete also passes, with a post-delete
edit rejected by the personal scope guard. Context-specific CRUD action names
were separated after a real global-action collision was found. The current
Odoo reference is available in `core3_reference`: paired authenticated captures
for My Timesheets, All Timesheets, and By Employee at desktop and mobile
completed 12/12 with no page/request failures. Full route and interaction
comparison remains open.

The 2026-09-20 bounded feature `TIMESHEET-CALENDAR-MULTI-CREATE` adds the
source-backed Odoo calendar multi-create lifecycle. It is covered by a durable
batch audit table, deterministic fixtures, YAML page/API separation,
`timesheets.write` and company/employee/relation guards, and file-backed
restart tests. Authenticated Core3 desktop/mobile and Odoo desktop/mobile
captures are committed under the feature evidence directory. This does not
change the module status to signed off.
Full parameterized route coverage, role-specific permissions, broader CRUD
persistence, and paired Odoo comparison remain open. No parity claim is made
here.

The current bounded feature `TIMESHEET-TASK-REPORT-BINDING` adds the
source-backed project.task report context. It owns the task page/API Print
contract, durable `timesheet_task_report_runs` persistence, deterministic
replay data, read/company/actor/stale/empty guards, and authenticated Core3
desktop/mobile evidence. The authenticated Odoo task route is reachable, but
its Actions menu has no Print item, so the paired report execution is recorded
as an exact reference blocker rather than a parity pass. This does not change
the module status to signed off.

The current bounded feature `TIMESHEET-PROJECT-REPORT-BINDING` extends the
existing project-context action from Project detail `Actions > Timesheets`.
It adds durable project report history, deterministic migration data,
read/company/actor/stale/empty guards, and authenticated Core3 desktop/mobile
evidence with HTTP 200 report actions. Authenticated Odoo project evidence is
paired at `/odoo/project/5`, where the project Actions menu has no Print item;
the source report execution is therefore an exact reference blocker. This
does not change the module status to signed off.

The current bounded feature `TIMESHEET-REPORT-PREVIEW-RENDERER` closes the
remaining Core3 renderer gap after the report binding slices. It adds the
page/API-separated `/timesheets/report-preview` route, a scoped read-only
report document, durable report-run creation/read, and the existing
employee/company/stale/missing guards. The entry Print action now uses the
YAML mutation envelope and navigates to the authenticated preview. Clean
isolated verification passes 57 Timesheets tests / 436 expectations and the
UI audit. Core3 desktop/mobile evidence is paired with authenticated Odoo
Timesheets list/kanban evidence; Odoo exposes no equivalent visible Print or
preview action, so that comparison remains an exact blocker. This does not
change the module status to signed off.

The current bounded feature `TIMESHEET-TASK-TIMESHEETS-REPORT` covers Odoo's
remaining `timesheet_report_task_timesheets` analytic-line renderer. It adds a
separate task-context `Print lines` page/API action, durable
`timesheet_task_lines_report_runs` persistence in migration `0.0.13`, fixed
fixtures, and read/task/empty/stale/actor/company guards with file-backed
restart coverage. The clean isolated Timesheets regression passes 53 tests /
416 expectations and the UI audit passes. Authenticated Core3 desktop/mobile
evidence is paired with authenticated Odoo task evidence; Odoo's Actions menu
has no Print action, so report execution is recorded as an exact blocker. This
does not change the module status to signed off.

## Next bounded task

Continue remaining report/context interaction and integration gates, including
the full authenticated route/action comparison, Odoo QWeb/PDF renderer parity,
and any remaining project-dashboard integration gaps.
Update this file only with evidence from the matching module owner.

## 2026-09-20 `TIMESHEET-ALL-ENTRY-REPORT-ACTION`

The next source-backed report/context gap was the approver All Timesheets
action. Odoo's `timesheet_action_all` at
`addons/hr_timesheet/views/hr_timesheet_views.xml:484-498` opens
`/odoo/all-timesheets` on `account.analytic.line`, and the source report
`timesheet_report` binds to that model in
`addons/hr_timesheet/report/report_timesheet_templates.xml:173-182`. Core3
previously exposed the manager list and detail but had no guarded Print action
or manager-scoped report document.

Core3 now adds a manager-only `Print` action to `all-timesheets-detail`, with
the page layout separated from `api/all-timesheets-detail.yaml` by
`page.id`. The API records a durable all-entry run in the existing
`timesheet_report_runs` table through `timesheets.all_entries.print_report`,
then navigates to the separate `/timesheets/all-report-preview` page/API
pair. The preview query is company-scoped and manager-permissioned; actor,
company, stale-row, missing-entry, and invalid-report guards run before the
insert. The stable seed run remains untouched, and migration replay plus a
file-backed restart preserve the new report.

Focused coverage is `test/timesheets_all_report.integration.test.ts` (3
tests, 16 expectations). The complete Timesheets suite passes 60 tests / 452
expectations, and the UI audit passes with 676 pages, 685 routes, and 1228
datasources. Authenticated Core3 desktop/mobile evidence is committed under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-all-report-action/`:
both viewports show the manager Print action, receive HTTP 200 from the
report mutation, render the persisted preview, and stay viewport-width safe.
The only Core3 failure record is the unrelated aborted `/api/v1/companies`
shell prefetch; no Timesheets request failed.

Paired authenticated Odoo evidence at `/odoo/all-timesheets` shows the seeded
desktop list and responsive mobile kanban, but neither viewport exposes a
visible Print/report-preview action. The source-bound Odoo report execution is
therefore an exact reference blocker, not a parity pass. QWeb/PDF equivalence,
the remaining route/action comparison, and module sign-off remain open.

## 2026-09-20 `TIMESHEET-EMPLOYEE-REPORT-ACTION`

The smallest remaining source-backed context action was Odoo's
`timesheet_action_from_employee` from
`addons/hr_timesheet/views/hr_timesheet_views.xml:547-565`, opened by
`hr.employee.action_timesheet_from_employee` and filtered to the active
employee. Core3's `/employee-timesheets` route already supplied the scoped
CRUD list but had no report action.

Core3 now adds a page-owned `Print` action and matching API action. The API
uses `page.id: employee-timesheets`, derives employee name/company/count/total
from persisted rows, and inserts a durable
`timesheet_employee_report_runs` record through
`timesheets.employee_entries.print_report`. Migration `0.0.14` seeds a fixed
employee report and is replay-safe. Employee, empty, company, actor, stale,
and missing guards execute before insertion; file-backed restart coverage
keeps the report history available.

Focused coverage is `test/timesheets_employee_report.integration.test.ts`
(4 tests, 23 expectations). Authenticated Core3 desktop/mobile evidence is
under `plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-employee-report-action/`;
both viewports show three scoped employee rows, Print, HTTP 200, and no
horizontal overflow. The normal full dev command hit an existing fresh-DuckDB
`ALTER TABLE ... ADD COLUMN ...` migration limitation, so evidence used the
Timesheets module runner; the feature migration tests pass independently.
The complete Timesheets suite passes 64 tests / 475 expectations, and the UI
audit passes with 676 pages, 685 routes, and 1239 datasources.
Authenticated Odoo desktop `/odoo/employees/3` shows Marc Demo's Timesheets
stat as `0`, and clicking it opens a new-entry action rather than a populated
employee report. Mobile hides the stat and records two aborted `/mail/data`
requests. This is an exact reference-data/action blocker, not a parity pass;
full route/action comparison and module sign-off remain open.

## 2026-09-20 `TIMESHEET-REPORT-EMPLOYEE-DRILLDOWN`

The smallest remaining owned report interaction was the By Employee analysis
row drilldown. Odoo defines the `timesheets.analysis.report` form at
`addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46` and binds the
By Employee action at lines 138-175. Core3 previously exposed only aggregate
Pivot/Graph/List states.

The page/API pair now returns relation IDs, applies the active-company scope,
and maps each report row to the existing authenticated Timesheet detail route
through the manager-only `view_employee_report_entry` action. Full-page
navigation replaced the mobile side panel after browser QA found a 429px
mobile overflow on the 390px viewport. File-backed restart tests confirm the
underlying persisted entry remains available after reload.

Focused coverage passes 4 tests / 15 expectations. The shared full Timesheets
suite passes 68 tests / 490 expectations; scoped ESLint passes and the current
UI audit passes with 679 pages, 688 routes, and 1247 datasources. Authenticated
Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-employee-report-drilldown/`.
Odoo renders the aggregate By Employee route but does not expose the loaded
row-to-form interaction; that is an exact reference blocker. Timesheets module
sign-off remains pending because the paired Odoo interaction and broader route/
action comparison are still incomplete.

## 2026-09-20 `TIMESHEET-PROJECT-DASHBOARD-SCOPE-GUARDS`

The smallest remaining integration gap was the Odoo project dashboard embedded
Timesheets action. Source `project_embedded_action_timesheets_dashboard` at
`hr_timesheet/views/hr_timesheet_views.xml:600-610` requires the project to be
timesheetable and uses the Timesheets user-group boundary. Core3's existing
Project dashboard consumed Timesheets operations by project ID without applying
those relation guards.

Timesheets `by_project` and `project_summary` now join `timesheet_projects`
and fail closed unless the project is active, timesheet-enabled, analytic-
account-backed, and in the fixed active company. The existing Project page/API
separation remains intact; the durable entry source is changed and read after
a file-backed restart. Focused coverage passes 4 tests / 26 expectations and
the shared Timesheets suite passes 72 tests / 516 expectations. ESLint,
diff-check, and the current UI audit (679 pages, 688 routes, 1250 datasources)
pass.

Authenticated Core3 desktop evidence shows the dashboard Timesheets panel and
rows. Mobile shows the same data but records an existing 477px-over-390px
Project dashboard overflow, which remains a Project-owned blocker. Authenticated
Odoo `/odoo/project/5` renders the project at both viewports but exposes no
visible Timesheets embedded action; this is the exact paired-reference blocker.
Module sign-off remains pending.
