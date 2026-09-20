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

## 2026-09-20 `TIMESHEET-EMPLOYEE-REPORT-PREVIEW`

The smallest remaining browser-visible context interaction was the employee
report renderer. Odoo's `timesheet_action_from_employee` in
`addons/hr_timesheet/views/hr_timesheet_views.xml:547-565` scopes analytic
lines to `active_id`, while the shared `timesheet_report` binding provides the
source report contract. Core3 already persisted guarded employee report runs,
but its employee Print action stopped at the generic browser print surface.

Core3 now keeps the employee report layout and API separate by `page.id` at
`/timesheets/employee-report-preview`. The preview reads the durable,
company-scoped employee report run and its persisted entry lines, exposes a
read-only summary plus line list, and retains Print/Back actions. The existing
employee report mutation remains the durable write boundary for actor, company,
stale, missing-employee, and empty-employee guards; preview reads fail closed
outside the active employee/company and support deterministic empty fixtures.

Focused coverage is
`test/timesheets_employee_report_preview.integration.test.ts` (4 tests / 23
expectations), including source binding, page/API separation, migration replay,
file-backed restart, persisted lines, and scope guards. Authenticated Core3
desktop/mobile captures follow employee Print to the preview and render three
persisted lines without browser/request failures or horizontal overflow.
Authenticated Odoo `/odoo/employees/3` shows the known empty/new-entry-only
employee Timesheets state and no visible Print/report action, so the source
report execution is recorded as an exact blocker rather than parity. Full
route/action comparison, QWeb/PDF equivalence, and module sign-off remain open.

## 2026-09-20 `TIMESHEET-TASK-REPORT-PREVIEW`

The smallest remaining browser-visible report interaction was Odoo's
`timesheet_report_task` QWeb-PDF binding in
`addons/hr_timesheet/report/report_timesheet_templates.xml:188-197`. Core3
already persisted guarded task report runs, but the task Print action still
stopped at the generic browser print surface without a report document.

Core3 now keeps the task report layout and API separate by `page.id` at
`/timesheets/task-report-preview`. The preview reads the durable,
company-scoped task report run and its persisted entry lines, exposes a
read-only summary plus line list, and retains Print/Back actions. The existing
task report mutation remains the durable write boundary for actor, company,
stale, missing-task, and empty-task guards; preview reads fail closed outside
the active task/company and support deterministic empty fixtures.

Focused coverage is
`test/timesheets_task_report_preview.integration.test.ts` (4 tests / 23
expectations), including source binding, page/API separation, migration replay,
file-backed restart, persisted lines, and scope guards. Authenticated Core3
desktop/mobile captures follow the task Print action to the preview and render
the persisted line without browser/request failures or horizontal overflow.
Authenticated Odoo `/odoo/all-tasks/100` renders the task at both viewports but
has no visible Timesheets Print/report action, so the source QWeb/PDF execution
is recorded as an exact blocker rather than parity. Full route/action
comparison, QWeb/PDF equivalence, and module sign-off remain open.

## 2026-09-20 `TIMESHEET-PROJECT-REPORT-PREVIEW`

The smallest remaining source-backed renderer gap was Odoo's
`timesheet_report_project` QWeb-PDF binding in
`addons/hr_timesheet/report/report_timesheet_templates.xml:205-213`. Core3
already persisted guarded project report runs, but the project Timesheets
action stopped at the browser print surface and had no authenticated report
document.

Core3 now keeps the project report layout and API separate by `page.id` at
`/timesheets/project-report-preview`. The preview reads the durable,
company-scoped project report run and its persisted entry lines, exposes a
read-only summary plus line list, and retains Print/Back actions. The existing
project report mutation remains the write boundary for actor, company, stale,
missing-project, and empty-project guards; the project preview API adds
company/project visibility guards and deterministic empty behavior.

Focused coverage is
`test/timesheets_project_report_preview.integration.test.ts` (4 tests / 22
expectations), including migration replay, file-backed restart, page/API
separation, persisted lines, company/project scope, and fixed source contract
checks. Authenticated Core3 desktop/mobile and paired authenticated Odoo
desktop/mobile evidence is committed under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-project-report-preview/`.
Core3 follows the project Print action to the preview and renders eight lines
without browser/request failures or horizontal overflow. Odoo `/odoo/project/5`
has no visible Timesheets Print/report action at either viewport, so the source
QWeb/PDF execution is recorded as an exact blocker rather than parity.

This bounded slice does not sign off Timesheets; full route/action comparison,
QWeb/PDF equivalence, other embedded interactions, and module sign-off remain
open.

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

## 2026-09-20 `TIMESHEET-TASK-TIMESHEET-LINES-PREVIEW`

The next smallest source-backed gap was the rendered task analytic-line report
action. Odoo declares `timesheet_report_task_timesheets` as a `qweb-pdf` report
for `account.analytic.line` in
`addons/hr_timesheet/report/report_timesheet_templates.xml:215-222`.

Core3 now separates the task-line preview page and API by
`page.id: task-timesheet-lines-report-preview`. The existing guarded
`timesheets.task_entries.print_lines_report` mutation remains the durable write
boundary and the task `Print lines` action navigates to
`/timesheets/task-lines-report-preview?id=...` after its HTTP 200 response. The
preview reads the latest company/task-scoped run and persisted entries from
`timesheet_task_lines_report_runs` and `timesheet_entries`; read failures fail
closed for missing, unavailable, wrong-company, wrong-task, and deterministic
empty fixtures. Actor, company, stale, empty, and missing-task mutation guards
remain in the existing binding.

Focused coverage is
`test/timesheets_task_lines_report_preview.integration.test.ts` (4 tests, 23
expectations): source/action contract, migration replay, file-backed restart,
persisted report line, company/task scope, and deterministic empty state.
Authenticated Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-task-timesheet-lines-preview/`;
both viewports render the report after the concrete `Print lines` click with no
browser errors or viewport overflow.

Authenticated Odoo `/odoo/all-tasks/100` renders at both viewports but exposes
no visible Print/report action. That is the exact QWeb/PDF comparison blocker;
missing Odoo Print/PDF/action surfaces, broader route/action comparison, and
Timesheets module sign-off remain open.

## 2026-09-21 `TIMESHEET-MY-ANALYSIS-VIEWS`

Selected the smallest remaining source-backed personal route gap: Odoo's
Pivot/Graph analysis views on `act_hr_timesheet_line`. Added `pivot` and
`graph` view contracts to the page YAML and a matching pivot field contract to
the separate API YAML. The existing durable `timesheet_entries` query supplies
week/date, project, hours, cost, employee, company, state, and concurrency
fields, so no duplicate persistence or fixture was introduced.

Verification: focused Timesheets tests pass 7/7 with 59 expectations;
ESLint, `git diff --check`, and `bun run audit` pass. Restart, company/actor
scope, empty fixture, read permission, stale row-version, source comparison,
page/API separation, and no-moving-value checks pass.

Evidence:
`evidence/timesheets/2026-09-21/timesheet-my-analysis-views/`. Authenticated
Core3 desktop renders Pivot and Graph; mobile hides both desktop-only tabs with
390px document/body width. Authenticated Odoo desktop renders the paired
Pivot/Graph controls and states; its mobile action is Kanban-only. Aborted
navigation-prefetch requests are recorded in `results.json`; page errors were
empty. Odoo Print/PDF/action gaps from prior slices remain blockers for the
module and no sign-off is claimed.

## 2026-09-21 `TIMESHEET-PORTAL-MY-TIMESHEETS`

- Source: Odoo authenticated `/my/timesheets` route and portal template provide
  employee/project/task/date search/group context plus the Date, Employee,
  Project, Task, Description, and Time Spent list.
- Core3: added the page/API-separated `/timesheets/my/timesheets` route and
  Portal menu item. The API reads durable `timesheet_entries` with active
  company and signed-in employee guards; the row action opens the existing
  own-scope detail page.
- Verification: `bun test test/timesheets_portal.integration.test.ts
  --timeout 20000` — 4 passed, 0 failed, 29 expectations; ESLint passed;
  `git diff --check` passed.
- Browser: authenticated Core3 desktop/mobile and Odoo desktop/mobile captures
  are in `evidence/timesheets/2026-09-21/timesheet-portal-my-timesheets/`.
- Blocker: Odoo portal rows are read-only in the captured state and expose no
  row-to-detail action. Core3's own-scope detail navigation is recorded without
  claiming paired Odoo row-action parity or module sign-off.

## 2026-09-21 `TIMESHEET-REPORT-BILLING-DRILLDOWN`

The next smallest unfinished source-backed report interaction was the Billing
Type report row context. Core3's existing durable billing report had no row
action. Its page remains layout-only and the API now returns company-scoped
employee/project/task relation context and owns the `timesheets.manage`-
guarded `view_billing_report_entry` action. Row open and double-click navigate
to the existing `/timesheets/detail` route with billing scope. Migration replay,
file-backed restart, company/empty guards, and deterministic fixture checks are
covered.

Focused coverage passes 4 tests / 20 expectations. Authenticated Odoo desktop
and mobile evidence is under
`evidence/timesheets/2026-09-21/timesheet-billing-report-drilldown/`; the
aggregate report renders but exposes no loaded row-to-entry form action.

Core3 browser evidence is blocked by the concurrent non-Timesheets discovery
boundary: `services/surveys/pages/surveys.yaml` fails at
`actions[4].fields is not allowed`; the audit also finds the stale shape in
`services/accounting/pages/invoices.yaml`. Neither file was changed or staged.
No browser parity or module sign-off is claimed.

## 2026-09-21 `TIMESHEET-ANALYSIS-DRILLDOWN`

The next smallest owned report interaction was the Odoo analysis row form:
`timesheets_analysis_report_form` and `act_hr_timesheet_report` in
`hr_timesheet/report/hr_timesheet_report_view.xml:23-46,138-175`.

Core3's `/timesheet-analysis` page remains layout-only and its API now returns
the persisted employee/project/task/date context from `timesheet_entries`,
scoped to the active company and deterministic empty fixture state. The API
owns the `timesheets.read`-guarded `view_timesheet_analysis_entry` action; the
page row-open and double-click bindings navigate to the existing durable
`/timesheets/detail` route with `view_scope: all` and
`report_scope: analysis`. Migration replay and a file-backed restart preserve
the analysis row and detail context.

Focused coverage passes 4 tests / 20 expectations. Authenticated Core3 desktop
and mobile evidence is under
`evidence/timesheets/2026-09-21/timesheet-analysis-drilldown/`; both viewports
open `Complete module migration` to the persisted `Migration work` detail with
no page/request errors or horizontal overflow.

Authenticated Odoo `/odoo/timesheets-by-employee` renders the aggregate report
at both viewports but does not expose a loaded row-to-analysis-form action.
That exact paired interaction blocker remains open; no parity or module
sign-off is claimed.

## 2026-09-20 `TIMESHEET-REPORT-PROJECT-DRILLDOWN`

The smallest remaining distinct report interaction was the By Project row
context. Odoo's shared `timesheets.analysis.report` form in
`addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46` exposes
`project_id`, `task_id`, `employee_id`, date, cost, time, and description; the
By Project action is `timesheet_action_report_by_project` at lines 178-214.

Core3's By Project page/API now carries durable `project_id` and `task_id`
relation context, filters the persisted report rows to the active company, and
declares the manager-only `view_project_report_entry` row/double-click action.
The action navigates to the existing durable `/project-timesheets` context with
`project_id`, so it does not duplicate the completed project report preview.
The target route renders the persisted project timesheet line after restart;
empty and wrong-company report reads fail closed.

Focused coverage is
`test/timesheets_project_report_drilldown.integration.test.ts` (4 tests, 16
expectations), including Odoo source/form comparison, page/API separation,
migration replay, file-backed restart, relation context, company scope,
manager permission, deterministic empty state, and fixed query values.
Authenticated Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-project-report-drilldown/`;
both viewports click the rendered project row and load the project context with
the persisted `Migration work` entry and no browser failures.

Authenticated Odoo `/odoo/timesheets-by-project` renders the aggregate report
at both viewports but exposes no loaded row-to-project-timesheet action/form.
This is the exact paired interaction blocker; remaining route/action comparison
and Timesheets module sign-off remain open.

## 2026-09-20 `TIMESHEET-REPORT-TASK-DRILLDOWN`

The smallest remaining distinct report interaction was the By Task row context.
Odoo's shared `timesheets.analysis.report` form in
`addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46` exposes
`project_id`, `task_id`, `employee_id`, date, cost, time, and description; the
By Task action is `timesheet_action_report_by_task` at lines 218-254.

Core3's By Task page/API now carries durable `project_id` and `task_id`
relation context, filters persisted report rows to the active company, and
declares the manager-only `view_task_report_entry` row/double-click action.
The action navigates to the existing durable `/task-timesheets` context with
`task_id`, so it does not duplicate the completed task report preview. The
target route renders the persisted task timesheet line after restart; empty and
wrong-company report reads fail closed.

Focused coverage is
`test/timesheets_task_report_drilldown.integration.test.ts` (4 tests, 16
expectations), including Odoo source/form comparison, page/API separation,
migration replay, file-backed restart, relation context, company scope,
manager permission, deterministic empty state, and fixed query values.
Authenticated Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-task-report-drilldown/`;
both viewports click the rendered task row and load the task context with the
persisted `Migration work` entry and no browser failures.

Authenticated Odoo `/odoo/timesheets-by-task` renders the aggregate report at
both viewports but exposes no loaded row-to-task-timesheet action/form. This is
the exact paired interaction blocker; remaining route/action comparison and
Timesheets module sign-off remain open.
