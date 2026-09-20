# timesheets QA ledger

## Review handoff — candidate `ffa83031` (2026-09-13)

- Conditional evidence reviewed: focused 6 tests / 37 assertions, migrations,
  CRUD/concurrency, selectors, validation, frontend build, audit, and
  diff-check pass.
- Candidate-scope repairs required before integration:
  1. replace the zero employee-cost calculation (`hours * unit_amount`) with
     the intended employee hourly-cost derivation, and add a regression
     assertion for the seeded `Admin User` cost;
  2. declare `mock_data` for `all_timesheet_entries`,
     `timesheet_analysis_totals`, `timesheet_analysis`, `timesheet_entries`,
     `timesheets_settings`, and `timesheet_detail`, or document and obtain
     approval for each runtime-only exception;
  3. commit the inactive-employee rejection assertion already exercised by QA.
- Environmental blockers preserved: live authenticated browser evidence is
  unavailable, and the available Odoo reference has Timesheets uninstalled.
  Pre-existing shared TypeScript diagnostics remain open.

Disposition: **conditional / not signed off; not integrated**. Return these
repairs to the same Timesheets owner and rerun the bounded review against a new
candidate; do not claim module or aggregate completion.

## Review handoff — repair candidate `813ff50b` (2026-09-13)

- Bounded repair integrated after conflict review as `0bba507c`, with its
  prerequisite CRUD migration integrated as `0ee54d30`.
- Verified in the merged active branch: employee-rate cost calculation (8 × 85
  = 680), inactive-employee rejection, six runtime-only justification entries,
  focused Timesheets CRUD suite (3 tests / 27 assertions in the merged slice),
  YAML/API ownership boundary, migration ordering, and `git diff --check`.
- The candidate's reported QA evidence remains recorded: focused 6 tests / 41
  assertions, audit/CSS/frontend/diff-check pass. The literal `mock_data` audit
  remains blocked because the scanner does not accept the runtime-only metadata
  justifications.
- Authenticated Core3 browser evidence and paired desktop/mobile Odoo
  Timesheets comparison remain unavailable/pending. Broader module gates remain
  open, so this is **conditional / not signed off** and does not imply module or
  aggregate completion.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/timesheets-desktop.png and timesheets-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable timesheets assignment (pending wave dispatch)
Module owner: timesheets module owner
Verification trigger: feature-complete
Candidate commit: current working tree

## 2026-09-21 `TIMESHEET-MY-INLINE-EDIT-001`

- Source gate: `hr_timesheet/views/hr_timesheet_views.xml:4-22` declares the
  internal My Timesheets list as `editable="top"` with date, project, task,
  activity name, and UoM time fields.
- Core3 contract gate: `pages/entries.yaml` owns the inline editable-top
  controls and `api/entries.yaml` owns the `timesheets.entries.create_inline`
  and `timesheets.entries.update_inline` mutations; both join through
  `page.id: timesheets`.
- Focused gate: `bun test
  test/timesheets_my_inline_edit.integration.test.ts --timeout 20000` — 4
  passed, 0 failed, 19 expectations. The complete Timesheets integration glob
  also passed 140 tests / 905 expectations.
- Persistence/security gate: inline CRUD uses durable `timesheet_entries`,
  active actor/company employee and project/task guards, Draft/Rejected scope,
  invalid-time checks, required `timesheets.write`, optimistic row-version
  concurrency, idempotent migrations, and file-backed restart coverage.
- Browser gate: authenticated Core3/Odoo desktop and mobile captures are in
  `../evidence/timesheets/2026-09-21/timesheet-my-inline-edit/`. Core3 desktop
  clicked a real row and rendered Save/Discard; all captures recorded no page
  errors or failed requests. Mobile surfaces are Calendar/Core3 and Kanban/Odoo;
  desktop-only inline editing is not claimed on mobile.
- Blockers: Odoo Print/PDF/report-action gaps remain open across the module;
  mobile inline editing is not claimed because the responsive source state is
  Kanban rather than editable list. This bounded slice is verified but does
  not sign off the Timesheets module.

## 2026-09-20 `TIMESHEET-CALENDAR-MULTI-CREATE`

- Odoo source gate: `hr_timesheet/views/hr_timesheet_views.xml:328-368`
  confirms the My Timesheets calendar and its
  `view_calendar_account_analytic_line_multi_create` form.
- Core3 gate: page/API remain separate by `page.id: timesheets`; the
  permissioned `Log multiple days` action expands an inclusive range into
  Draft entries and records `timesheet_entry_batches`.
- Focused test gate: `bun test test/timesheets_calendar_multi_create.integration.test.ts
  --timeout 20000` — 4 passed, 0 failed, 21 assertions. Full suite:
  `bun test test/timesheets*.integration.test.ts --timeout 20000` — 41 passed,
  0 failed, 355 assertions.
- Guard/persistence gate: range, hours, active employee/company, project/task
  relation, migration replay, atomic no-partial write, and file-backed restart
  are covered. Audit, scoped ESLint, and diff-check pass.
- Browser gate: authenticated Core3 and Odoo captures are stored in
  `../evidence/timesheets/2026-09-20/timesheet-calendar-multi-create/`.
  Core3 desktop/mobile opened and submitted the modal; Odoo desktop shows the
  calendar and Odoo mobile resolves to responsive kanban. No page/request
  errors or horizontal overflow were observed.
- Disposition: **bounded slice verified; module sign-off remains pending**.

Detailed execution matrix: [`test-plans/timesheets.md`](test-plans/timesheets.md). It is the module-level source for entries, approvals, Project integration, actors, persistence, Temporal, and paired Odoo gates.

## Current regression evidence

### 2026-09-20 `TIMESHEET-TASK-REPORT-BINDING`

- Source contract: Odoo `hr_timesheet/report/report_timesheet_templates.xml:188-197`, `timesheet_report_task`, binds a `qweb-pdf` report to `project.task` under the Timesheets user group.
- Core3 contract: `task-timesheets` page/API are separate by `page.id`; the page owns `Print`, while the API derives scoped task/project context, exposes report history, and records `timesheets.task_entries.print_report` runs in migration `0.0.11`.
- Focused gate: `bun test test/timesheets_task_report.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 20 assertions. Full suite: `bun test test/timesheets*.integration.test.ts --timeout 20000` — 45 passed, 0 failed, 375 assertions.
- Persistence/security gate: migration replay, file-backed restart, missing/empty/stale/actor/company guards, and no-partial-write behavior pass. Scoped ESLint and `git diff --check` pass; audit reports 669 pages, 678 routes, and 1203 datasources.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 captures show the task row and Print action; each interaction emitted one POST to `/api/actions/timesheets.task_entries.print_report`, with zero page/request errors and viewport-matched scroll widths.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/all-tasks/100` for `S00038 - Solar Panel Installation` at desktop and mobile. The task has a Timesheets tab, but the Actions menu contains `Timesheets`, `Edit Properties`, `Version History`, `Duplicate`, `Archive`, `Delete`, `Share Task`, `Send SMS`, `Convert to Task/Sub-Task`, `Convert to Template`, and `Actions`; it contains no `Print`. Mobile also reports two aborted `/mail/data` requests during route navigation. The paired report execution is therefore blocked by the current reference UI and is not claimed as a parity pass.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-task-report/`](../evidence/timesheets/2026-09-20/timesheet-task-report/).
- Disposition: **bounded Core3 slice verified; paired Odoo report binding and full module sign-off remain pending**.

### 2026-09-20 `TIMESHEET-PROJECT-REPORT-BINDING`

- Source contract: Odoo `hr_timesheet/report/report_timesheet_templates.xml:199-213`, `timesheet_report_project`, binds `hr_timesheet.report_timesheet_project` as a project report for `project.project`.
- Core3 contract: Project detail `Actions > Timesheets` reaches the existing `/timesheets/project-timesheets` page/API pair; the page owns `Print`, and the API owns project context, report history, and `timesheets.project_entries.print_report`.
- Focused gate: `bun test test/timesheets_project_report.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 21 assertions. Full suite: `bun test test/timesheets*.integration.test.ts --timeout 20000` — 49 passed, 0 failed, 396 assertions.
- Persistence/security gate: migration replay, file-backed restart, missing/empty/stale/actor/company guards, and no-partial-write behavior pass. Scoped ESLint and `git diff --check` pass; audit reports 670 pages, 679 routes, and 1210 datasources.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 captures open Project detail → Actions → Timesheets, load eight project entries, expose Print, and each emit one HTTP 200 POST to `/api/actions/timesheets.project_entries.print_report`; page/request errors are empty and scroll widths match the viewport.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/project/5` for `Home Construction` at desktop and mobile. The project Actions menu contains `Timesheets`, `Duplicate`, `Archive`, `Delete`, and `Convert to Template`, but no `Print`; the paired report execution is blocked by the current reference UI and is not claimed as parity.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-project-report/`](../evidence/timesheets/2026-09-20/timesheet-project-report/).
- Disposition: **bounded Core3 slice verified; paired Odoo report binding, full route/action comparison, and module sign-off remain pending**.

### 2026-09-20 `TIMESHEET-TASK-TIMESHEETS-REPORT`

- Source contract: Odoo `hr_timesheet/report/report_timesheet_templates.xml:215-222` defines `timesheet_report_task_timesheets` for `account.analytic.line`, using `hr_timesheet.report_timesheet_task`; the renderer template is at lines 146-171.
- Core3 contract: `task-timesheets` page/API remain separate by `page.id`; the page owns `Print lines`, the task entry list supplies the report lines, and the API records `timesheets.task_entries.print_lines_report` in durable `timesheet_task_lines_report_runs` migration `0.0.13`.
- Focused gate: `bun test test/timesheets_task_lines_report.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 20 expectations. Clean isolated full suite: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 53 passed, 0 failed, 416 expectations.
- Persistence/security gate: migration replay, file-backed restart, task/empty/stale/actor/company guards, no-partial-write behavior, and `timesheets.read` action permissions pass. Scoped ESLint and `git diff --check` pass; clean isolated audit reports 670 pages, 679 routes, and 1211 datasources.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 captures render one task line, expose `Print lines`, and return HTTP 200 from the report action with zero Core3 page/request errors and matching viewport widths.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/all-tasks/100` at both viewports. The task Actions menu has no Print action, blocking execution of the source report binding; mobile also reports three aborted non-report asset/action requests. This is an exact paired-reference blocker, not a parity pass.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-task-timesheets-report/`](../evidence/timesheets/2026-09-20/timesheet-task-timesheets-report/).
- Disposition: **bounded Core3 slice verified; paired Odoo renderer execution, full route/action comparison, QWeb/PDF parity, and module sign-off remain pending**.

### 2026-09-20 `TIMESHEET-REPORT-PREVIEW-RENDERER`

- Source contract: Odoo `hr_timesheet/report/report_timesheet_templates.xml` `report_timesheet` renders Timesheets, Date, Employee, optional Project/Task, Description, Time Spent, and a total for `account.analytic.line` rows.
- Core3 contract: `timesheet-detail` and `timesheet-report-preview` remain page/API-separated by `page.id`; the entry Print action posts the YAML `values` envelope, records `timesheets.entries.print_report`, and navigates to a scoped read-only report document backed by `timesheet_report_runs`.
- Focused gate: `bun test test/timesheets_report_preview.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 20 expectations. Clean isolated full suite: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 57 passed, 0 failed, 436 expectations.
- Persistence/security gate: report create/read, migration replay, file-backed restart, employee/company visibility, missing-entry, actor, company, stale-row, and invalid-request guards pass. Scoped ESLint and `git diff --check` pass; clean isolated audit reports 671 pages, 680 routes, and 1212 datasources.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 submit the report action with HTTP 200, render the persisted preview, and remain viewport-width safe. The evidence JSON records one unrelated aborted `/api/v1/companies` shell prefetch and no Timesheets request failure.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/timesheets` desktop list and mobile kanban with seeded rows, but neither viewport exposes a visible Print/report-preview action, blocking the paired interaction comparison. This is an exact reference blocker, not a parity pass.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-report-preview-renderer/`](../evidence/timesheets/2026-09-20/timesheet-report-preview-renderer/).
- Disposition: **bounded Core3 renderer verified; Odoo QWeb/PDF renderer equivalence, full route/action comparison, and module sign-off remain pending**.

## 2026-09-20 `TIMESHEET-ALL-ENTRY-REPORT-ACTION`

- Source gate: Odoo `timesheet_action_all` (`hr_timesheet/views/hr_timesheet_views.xml:484-498`) uses `/odoo/all-timesheets` for `account.analytic.line`; `report_timesheet` is bound to that model in `hr_timesheet/report/report_timesheet_templates.xml:173-182`.
- Core3 contract: manager-only `all-timesheets-detail` Print action and separate `all-timesheet-report-preview` page/API pair; report runs persist in `timesheet_report_runs` through `timesheets.all_entries.print_report`.
- Focused gate: `bun test test/timesheets_all_report.integration.test.ts --timeout 20000` — 3 passed, 0 failed, 16 expectations. Full suite: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 60 passed, 0 failed, 452 expectations.
- Persistence/security gate: migration replay, file-backed restart, company/actor/stale/missing/invalid guards, and no-partial-write behavior pass. UI audit: 676 pages, 685 routes, 1228 datasources. Repository-wide `git diff --check` remains noisy from a pre-existing unrelated Inventory trailing-space edit; the Timesheets-owned diff has no whitespace errors.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 open All Timesheets entry detail, expose Print, post `/api/actions/timesheets.all_entries.print_report` with HTTP 200, render the persisted preview, and remain width-safe. Evidence includes before/after screenshots and `results.json`.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/all-timesheets` desktop list and mobile kanban with seeded rows and no page/request errors, but neither viewport exposes a visible Print/report-preview action. This is an exact source/reference blocker, not a parity pass.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-all-report-action/`](../evidence/timesheets/2026-09-20/timesheet-all-report-action/).
- Disposition: **bounded Core3 manager report action verified; Odoo action visibility/QWeb-PDF parity, remaining route/action comparison, and module sign-off remain pending**.

## 2026-09-20 `TIMESHEET-EMPLOYEE-REPORT-ACTION`

- Source gate: Odoo `timesheet_action_from_employee` (`hr_timesheet/views/hr_timesheet_views.xml:547-565`) filters `account.analytic.line` by `active_id`; `hr.employee.action_timesheet_from_employee` opens that action from the employee form.
- Core3 contract: `/employee-timesheets` remains page/API-separated; its Print action records `timesheets.employee_entries.print_report` in durable `timesheet_employee_report_runs` migration `0.0.14`.
- Focused gate: `bun test test/timesheets_employee_report.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 23 expectations. Full module gate: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 64 passed, 0 failed, 475 expectations.
- Persistence/security gate: migration replay, file-backed restart, employee/company scope, empty, actor, stale, missing, and no-partial-write guards pass in the focused suite. The normal `bun dev --db=ddb --memory` browser bootstrap hit the pre-existing DuckDB `ALTER TABLE ... ADD COLUMN ...` constraint error; the module runner served the authenticated evidence. No product fix was made for that unrelated startup limitation.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 load employee `employee-demo-002`, show three scoped rows and Print, post `/api/actions/timesheets.employee_entries.print_report` with HTTP 200, and remain width-safe with no Core3 page/request errors.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/employees/3` for Marc Demo. Desktop shows `Timesheets 0`; clicking the stat opens `/odoo/employees/3/action-748/new` (new-entry form) rather than a populated employee report. Mobile hides the stat and records two aborted `/mail/data` requests. This is an exact reference-data/action blocker, not a parity pass.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-employee-report-action/`](../evidence/timesheets/2026-09-20/timesheet-employee-report-action/).
- Disposition: **bounded Core3 employee-context report action verified; Odoo populated employee report comparison, remaining route/action comparison, and module sign-off remain pending**.

### 2026-09-20 bounded report-binding slice

- Source contract: Odoo `hr_timesheet/report/report_timesheet_templates.xml`,
  `timesheet_report` (`account.analytic.line`, `qweb-pdf`, report name
  `hr_timesheet.report_timesheet`).
- Core3 implementation: entry-detail YAML `Print` action, API-owned
  `timesheets.entries.print_report` report mutation, and durable
  `timesheet_report_runs` migration `0.0.9`.
- Focused evidence: `bun test test/timesheets_report.integration.test.ts
  --timeout 20000` — 4 passed, 0 failed, 22 assertions. This includes
  page/API separation, deterministic replay, file-backed restart persistence,
  personal/company scope, stale-row, missing-entry, and invalid-request guards.
- Browser print is intentionally the existing client print surface after the
  server-side run record is persisted. Project/task report bindings and a
  QWeb/PDF renderer remain open and are not claimed by this slice.

- Focused Timesheets suite: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 27 passed, 0 failed, 275 assertions across 8 files; the reporting retest after the fix passed 8/8 with 118 assertions.
- Authenticated module-scoped route matrix: 13 routes × desktop/mobile; an isolated fresh-page rerun with valid detail IDs passed 26/26 with no page/request errors or horizontal overflow. The earlier 22/26 bare-route result was a reused-page traversal artifact; Timesheet Analysis exposed a real missing-pivot-fields contract.
- Fix: declared `pivot.fields` for `timesheet_analysis` in `services/timesheets/api/analysis.yaml`; a fresh authenticated retest rendered Pivot/Graph/List with no HTTP or browser failures.
- Authenticated mutation smoke on a fresh `timesheets,project` runner: created Draft → Submitted → Approved with HTTP 200 at each step and row versions 1 → 3. Approval dispatched the Project-owned `project.projects.add_hours` mutation after loading `project_id` and `hours` from the submitted row.
- Permission boundary smoke on the same runner: Fleet received 403 for `/api/pages/timesheets`, `/api/pages/all-timesheets`, `/api/pages/timesheets-settings`, and `timesheets.entries.approve`, with the expected `timesheets.read`, `timesheets.manage`, and `timesheets.settings` permission errors.
- Authenticated CRUD smoke on a fresh runner: Admin create → edit → delete returned HTTP 200, row version advanced 1 → 2, and a post-delete edit was rejected with the expected personal-scope 403. Context-specific CRUD actions are now globally unique so each page invokes its own guard.
- Current paired Odoo/Core3 browser evidence: My Timesheets, All Timesheets, and By Employee captured for both products at 1440x900 and 390x844; 12/12 captures completed with no page/request failures. Files are under `/tmp/odoo-timesheets/*-20260912.png`.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| TIMESHEETS-FUNC-001 | Focused functionality, reports, scoped CRUD, settings, and embedded-task contracts | 27 tests, 275 assertions; focused suite passed | pass |
| TIMESHEETS-BROWSER-001 | Authenticated route matrix | 26/26 isolated fresh-page checks across 13 routes × desktop/mobile, including valid detail IDs; no page/request errors or horizontal overflow | pass |
| TIMESHEETS-FUNC-002 | Timesheet Analysis Pivot/Graph/List runtime | Missing API pivot contract fixed; fresh authenticated retest rendered all three views with no failures | pass |
| TIMESHEETS-FUNC-003 | Cross-module approval workflow | Authenticated create → submit → approve passed; Project hours contract was invoked after approval inputs were assigned from the row | pass |
| TIMESHEETS-PERM-001 | Fleet permission boundary | Fleet denied personal, all-timesheets, settings, and approval endpoints with expected 403 permission errors | pass |
| TIMESHEETS-FUNC-004 | Authenticated CRUD persistence | Admin create → edit → delete passed HTTP 200; post-delete edit rejected; duplicate global action-name regression covered | pass |
| TIMESHEETS-BROWSER-002 | Paired Odoo/Core3 loaded-state comparison | 12 authenticated captures across My, All, and By Employee at desktop/mobile; no page/request failures | partial pass |
| TIMESHEETS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Full parameterized route matrix, role boundaries, authenticated mutation smoke, and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| TIMESHEETS-QA-001 | Timesheet Analysis requested pivot data but API datasource declared no pivot fields | Current working tree | Added `pivot.fields`; reporting test 6/6 and authenticated Pivot/Graph/List retest passed | fixed |
| TIMESHEETS-QA-002 | Duplicate global CRUD action names caused personal delete to execute task scope | `afe0fa2a` working tree | Context-specific action names plus authenticated create/edit/delete smoke and 27-test suite passed | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: partial; three representative routes paired, remaining enabled routes and interaction states open
- Tester decision: not signed off

## 2026-09-20 `TIMESHEET-PROJECT-REPORT-PREVIEW`

- Source gate: Odoo `timesheet_report_project` is a `qweb-pdf` report bound to
  `project.project` in `hr_timesheet/report/report_timesheet_templates.xml:205-213`.
- Core3 gate: `project-timesheets` remains page/API-separated and its guarded
  Print action now navigates to `/timesheets/project-report-preview`; the new
  API reads the durable project report run and company-scoped persisted lines.
- Focused gate: `bun test test/timesheets_project_report_preview.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 22 expectations.
- Persistence/security gate: migration replay and file-backed restart preserve
  the report run and eight lines; project/company visibility and deterministic
  empty fixtures are asserted; mutation actor/company/stale/empty guards remain
  covered by the existing project report binding test.
- Core3 browser gate: authenticated Admin desktop `1440x900` and mobile
  `390x844` click project Print, land on the preview, render the persisted
  summary and eight lines, and report zero page/request failures with no
  horizontal overflow.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/project/5`
  at both viewports with zero page/request failures, but exposes no visible
  Timesheets Print/report action. This exact reference blocker prevents paired
  QWeb/PDF execution parity.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-project-report-preview/`](../evidence/timesheets/2026-09-20/timesheet-project-report-preview/).
- Disposition: **bounded Core3 project report preview verified; Odoo QWeb/PDF
  comparison, remaining route/action comparison, and module sign-off remain
  pending**.

## 2026-09-13 coordinator dispatch: next bounded wave

- Existing owner: `agent/odoo-ui-timesheets-next`, worktree
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-timesheets-next`, base
  `813ff50b`. Development event: `DEV-TIMESHEETS-WAVE-20260913`; QA event:
  `QA-TIMESHEETS-WAVE-20260913`; handoff commit `54ddd2b7`.
- Candidate is pending. Target is the next bounded mock-data/employee-cost or
  employee-validation repair. Focused tests, audit, CSS/frontend build,
  scoped ESLint, and diff-check are required before triggering existing QA.
  Aggregate progress remains untouched.
## 2026-09-13 coordinator reactivation

- Existing owner `agent/odoo-ui-timesheets-next` is reactivated on the same
  worktree. Resolve the literal `mock_data` audit exception for six sources
  and add one focused employee-cost/employee-validation parity repair.
- Existing development event `DEV-TIMESHEETS-WAVE-20260913` and QA event
  `QA-TIMESHEETS-WAVE-20260913` remain assigned. Candidate is pending; no
  aggregate progress change.
## 2026-09-13 owner checkpoint

- `22f581f3` and `737c264d` are dispatch/checkpoint commits only; no product
  candidate has been submitted. QA remains untriggered pending a self-contained
  implementation commit and evidence.
## 2026-09-13 poll after `737c264d`

- No product diff exists after the checkpoint; owner was re-prompted. QA event
  remains untriggered pending implementation and focused tests.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-TIMESHEETS-VISUAL-WAVE-20260913-R2` → `QA-TIMESHEETS-VISUAL-WAVE-20260913-R2` | existing `agent/odoo-ui-timesheets-visual3-20260912` in `/home/nhanjs/projects/core3-worktrees/timesheets-visual3-20260912` | File-backed restart persistence for entries/approvals and linked hours, migration replay, scope, stale/duplicate/employee guards, and focused tests | dispatched in `096f7239`; awaiting self-contained product commit before QA |

## 2026-09-20 `TIMESHEET-REPORT-EMPLOYEE-DRILLDOWN`

- Source gate: Odoo `timesheets.analysis.report` form view (`hr_timesheet/report/hr_timesheet_report_view.xml:23-46`) and By Employee action (`:138-175`) provide the report detail contract.
- Core3 contract: `timesheets-by-employee` remains page/API-separated; the API adds relation IDs, active-company filtering, and manager-only `view_employee_report_entry` navigation to `/timesheets/detail` with `view_scope: all`.
- Focused gate: `bun test test/timesheets_employee_report_drilldown.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 15 expectations. Full shared module gate: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 68 passed, 0 failed, 490 expectations.
- Persistence/security gate: persisted report rows and detail survive a file-backed restart; manager permission and company scope are asserted; fixed-fixture and no-moving-time checks pass. Scoped ESLint passes; UI audit reports 676 pages, 685 routes, and 1239 datasources.
- Core3 browser gate: authenticated `admin@tms.local` desktop 1440x900 and mobile 390x844 switch By Employee from Pivot to List, open `timesheet-demo-001`, load `/timesheets/detail?id=timesheet-demo-001&view_scope=all&report_scope=employee`, and remain width-safe with no Core3 page errors.
- Odoo browser gate: authenticated `codex@core3.local` reaches `/odoo/timesheets-by-employee` at desktop and mobile and renders aggregate analysis rows, but the loaded reference route exposes no visible row-to-form detail action. Desktop has one unrelated aborted `/mail/data` request; mobile has three unrelated aborted asset/action requests. This is an exact paired-reference blocker, not a parity pass.
- Runtime boundary: browser capture used a temporary, non-committed runtime workaround while concurrent Ecommerce schema repairs were present; the current shared Timesheets suite and UI audit pass, and no other module files were changed or staged.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-employee-report-drilldown/`](../evidence/timesheets/2026-09-20/timesheet-employee-report-drilldown/).
- Disposition: **bounded Core3 By Employee report drilldown verified; Odoo row-form comparison, remaining route/action comparison, and module sign-off remain pending**.

## 2026-09-20 `TIMESHEET-PROJECT-DASHBOARD-SCOPE-GUARDS`

- Source gate: Odoo `project_embedded_action_timesheets_dashboard` (`hr_timesheet/views/hr_timesheet_views.xml:600-610`) binds the Timesheets action to the project update dashboard, passes `from_embedded_action`, filters `allow_timesheets = True`, and requires the Timesheets user group.
- Core3 contract: the existing Project dashboard page remains layout-only; its API keeps `project_dashboard_timesheets` and `project_dashboard_timesheet_entries` bound to `yaml.service.timesheets`. Timesheets `by_project` and `project_summary` now require active, timesheet-enabled, analytic-account-backed projects in `Core3 Demo Company`.
- Focused gate: `bun test test/timesheets_project_dashboard_scope.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 26 expectations. Full shared module gate: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 72 passed, 0 failed, 516 expectations.
- Persistence/security gate: durable dashboard entries and 33-hour summary survive a file-backed restart after an entry update; non-timesheetable, missing-account, wrong-company, and missing-project contexts return no rows without modifying entries. Scoped ESLint, `git diff --check`, and UI audit pass (679 pages, 688 routes, 1250 datasources).
- Core3 browser gate: authenticated `admin@tms.local` on the temporary dependency-aware runtime renders `/project/projects/detail/dashboard?id=project-demo-001`; desktop shows the Timesheets panel, Hours logged, Entries, and seeded rows with zero page/request errors. Mobile shows the panel and rows with zero page/request errors, but the Project-owned layout has `document.scrollWidth = 477` at a 390px viewport.
- Odoo browser gate: authenticated `codex@core3.local` on `core3_reference` reaches `/odoo/project/5` at desktop and mobile with zero page/request errors and no horizontal overflow, but the loaded project dashboard/form exposes no visible Timesheets embedded action. This is an exact paired-reference blocker, not a parity pass.
- Runtime boundary: browser capture used a temporary runtime containing the owned Timesheets operation change; the shared checkout's unrelated Project discovery boundary (`components[0].row_action`) was not repaired or staged.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-project-dashboard-scope-guards/`](../evidence/timesheets/2026-09-20/timesheet-project-dashboard-scope-guards/).
- Disposition: **bounded Timesheets dashboard scope guards verified; Core3 mobile Project overflow, Odoo embedded-action comparison, broader route/action comparison, and module sign-off remain pending**.

## 2026-09-20 `TIMESHEET-TASK-REPORT-PREVIEW`

- Source gate: Odoo `timesheet_report_task` is a `qweb-pdf` report bound to
  `project.task` in `hr_timesheet/report/report_timesheet_templates.xml:188-197`.
- Core3 gate: `task-timesheets` remains page/API-separated and its guarded
  Print action now navigates to `/timesheets/task-report-preview`; the new API
  reads the durable task report run and company-scoped persisted lines.
- Focused gate: `bun test test/timesheets_task_report_preview.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 23 expectations.
- Persistence/security gate: migration replay and file-backed restart preserve
  the report run and task line; task/company visibility and deterministic empty
  fixtures are asserted; mutation actor/company/stale/empty guards remain
  covered by the existing task report binding test.
- Core3 browser gate: authenticated Admin desktop `1440x900` and mobile
  `390x844` click task Print, land on the preview, render the persisted summary
  and line, and report zero page/request failures with no horizontal overflow.
- Odoo browser gate: authenticated `codex@core3.local` reaches
  `/odoo/all-tasks/100` at both viewports with zero page/request failures, but
  exposes no visible Timesheets Print/report action. This exact reference
  blocker prevents paired QWeb/PDF execution parity.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-task-report-preview/`](../evidence/timesheets/2026-09-20/timesheet-task-report-preview).
- Disposition: **bounded Core3 task report preview verified; Odoo QWeb/PDF
  comparison, remaining route/action comparison, and module sign-off remain
  pending**.

## 2026-09-20 `TIMESHEET-EMPLOYEE-REPORT-PREVIEW`

- Source gate: Odoo `timesheet_action_from_employee`
  (`hr_timesheet/views/hr_timesheet_views.xml:547-565`) scopes analytic lines
  to `active_id`; the shared `timesheet_report` binding supplies the report
  contract.
- Core3 gate: `employee-timesheets` remains page/API-separated and its guarded
  Print action now navigates to `/timesheets/employee-report-preview`; the new
  API reads the durable employee report run and company-scoped persisted lines.
- Focused gate: `bun test test/timesheets_employee_report_preview.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 23 expectations.
- Persistence/security gate: migration replay and file-backed restart preserve
  the report run and three employee lines; employee/company visibility and
  deterministic empty fixtures are asserted; mutation actor/company/stale/
  empty guards remain covered by the existing employee report binding test.
- Core3 browser gate: authenticated Admin desktop `1440x900` and mobile
  `390x844` click employee Print, land on the preview, render Morgan Taylor's
  persisted summary and three lines, and report zero page/request failures with
  no horizontal overflow.
- Odoo browser gate: authenticated `codex@core3.local` reaches
  `/odoo/employees/3` at both viewports with zero page/request failures; the
  desktop Timesheets stat is empty/new-entry-only, mobile hides it, and neither
  viewport exposes a visible Print/report action. This exact reference-data/
  action blocker prevents paired report execution parity.
- Evidence: [`evidence/timesheets/2026-09-20/timesheet-employee-report-preview/`](../evidence/timesheets/2026-09-20/timesheet-employee-report-preview).
- Disposition: **bounded Core3 employee report preview verified; Odoo report
  comparison, remaining route/action comparison, and module sign-off remain
  pending**.

## `TIMESHEET-TASK-TIMESHEET-LINES-PREVIEW` — 2026-09-20

Source comparison: Odoo's `timesheet_report_task_timesheets` report is the
`account.analytic.line` QWeb-PDF action in
`addons/hr_timesheet/report/report_timesheet_templates.xml:215-222`.

Core3 implementation: the task Timesheets page remains separate from the API;
its `Print lines` action calls the guarded report mutation and then routes to
`/timesheets/task-lines-report-preview`. The new read-only page/API pair loads
the durable latest task-line run and company/task-scoped persisted entries.
The existing durable mutation enforces actor, company, stale, empty, and
missing-task guards. Preview reads return deterministic empty/not-found states
and transport errors without widening scope.

Verification: `bun test
test/timesheets_task_lines_report_preview.integration.test.ts --timeout 20000`
passes 4 tests / 23 expectations. It covers YAML page/API separation, source
contract, migration replay, file-backed restart, persisted line rendering,
company/task scope, and deterministic empty fixtures. Authenticated Core3
desktop/mobile evidence is in
`evidence/timesheets/2026-09-20/timesheet-task-timesheet-lines-preview/`;
both viewports click the rendered action, show the durable run and Migration
work line, and have no browser errors or non-favicon request failures.

Paired authenticated Odoo desktop/mobile evidence reaches
`/odoo/all-tasks/100` but exposes no visible Print/report action. The source
QWeb/PDF execution therefore cannot be paired; this is an exact blocker, not a
parity pass. Missing Odoo Print/PDF/action surfaces, full route/action
comparison, and module sign-off remain pending.

## `TIMESHEET-REPORT-PROJECT-DRILLDOWN` — 2026-09-20

Source gate: Odoo's `timesheets_analysis_report_form` defines the project/task
relation fields at `addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46`;
the By Project action `timesheet_action_report_by_project` is defined at
`:178-214`.

Core3 gate: `timesheets-by-project` remains page/API-separated. Its report
datasource now returns `project_id` and `task_id`, scopes rows to the active
company, and owns the manager-only `view_project_report_entry` navigation
action. The rendered row action opens the existing durable
`/project-timesheets?project_id=...` context, where the persisted project line
is visible. No duplicate report preview or new fixture table was introduced.

Focused gate: `bun test
test/timesheets_project_report_drilldown.integration.test.ts --timeout 20000`
passes 4 tests / 16 expectations. Migration replay/file-backed restart,
relation context, company/permission guards, deterministic empty state, source
contract, and no-moving-value checks pass. Authenticated Core3 desktop/mobile
evidence is in
`evidence/timesheets/2026-09-20/timesheet-project-report-drilldown/`; both
viewports navigate from the rendered row to the project context without page
errors, failed requests, or overflow.

Paired authenticated Odoo desktop/mobile evidence reaches
`/odoo/timesheets-by-project` and renders the aggregate report, but no loaded
row-to-project-timesheet action/form is exposed. The source form contract is
therefore recorded without claiming paired interaction parity. Remaining
route/action comparison and module sign-off remain pending.

## 2026-09-21 `TIMESHEET-REPORT-BILLING-DRILLDOWN`

- Source gate: authenticated Odoo menu inventory exposes Timesheets by Billing
  Type on the shared analysis report model; its source form contract includes
  employee, project, task, date, description, and time context.
- Core3 contract: `/timesheets-billing` stays page/API-separated; the API
  returns active-company durable relation context and owns the
  `timesheets.manage`-guarded `view_billing_report_entry` action. The page
  binds row open and double-click to the existing Timesheet detail route.
- Focused gate: `bun test test/timesheets_billing_report_drilldown.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 20 expectations.
- Persistence/security gate: migration replay and file-backed restart preserve
  the billing row and detail context; wrong-company and empty fixture reads
  return no rows; page and action require `timesheets.manage`.
- Odoo browser gate: authenticated `/odoo/timesheets-billing` renders at
  desktop and mobile without overflow, but exposes no loaded row-to-entry form
  action. This is an exact paired-action blocker.
- Core3 browser blocker: discovery stops on the concurrent non-Timesheets
  `services/surveys/pages/surveys.yaml` `actions[4].fields` schema error; the
  audit also identifies `services/accounting/pages/invoices.yaml`. Neither
  owner boundary was repaired.
- Evidence: [`evidence/timesheets/2026-09-21/timesheet-billing-report-drilldown/`](../evidence/timesheets/2026-09-21/timesheet-billing-report-drilldown/).
- Disposition: **bounded API/contract/restart slice verified; Core3 runtime and
  paired Odoo row action remain blocked, so no module sign-off is claimed**.

## 2026-09-21 `TIMESHEET-ANALYSIS-DRILLDOWN`

- Source gate: Odoo `timesheets_analysis_report_form` and
  `act_hr_timesheet_report` in `hr_timesheet/report/hr_timesheet_report_view.xml:23-46,138-175`
  expose the analysis row employee/project/task/date/time context.
- Core3 contract: `/timesheet-analysis` stays page/API-separated; the API
  returns company-scoped durable `timesheet_entries` context and owns the
  `timesheets.read`-guarded `view_timesheet_analysis_entry` action. The page
  binds row open and double-click to `/timesheets/detail` with analysis scope.
- Focused gate: `bun test test/timesheets_analysis_drilldown.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 20 expectations.
- Persistence/security gate: migration replay and file-backed restart preserve
  the report row and detail context; wrong-company and empty fixture reads
  return no rows; page and action require `timesheets.read`.
- Core3 browser gate: authenticated Admin desktop `1440x900` and mobile
  `390x844` open `Complete module migration` to the persisted `Migration work`
  detail with no page/request errors or horizontal overflow.
- Odoo browser gate: authenticated `/odoo/timesheets-by-employee` renders the
  aggregate report at both viewports with no horizontal overflow, but exposes
  no loaded row-to-analysis-form action. This exact paired interaction blocker
  prevents a parity claim.
- Evidence: [`evidence/timesheets/2026-09-21/timesheet-analysis-drilldown/`](../evidence/timesheets/2026-09-21/timesheet-analysis-drilldown/).
- Disposition: **bounded Core3 analysis drilldown verified; Odoo row-form
  comparison, remaining route/action comparison, and module sign-off remain
  pending**.

## `TIMESHEET-REPORT-TASK-DRILLDOWN` — 2026-09-20

Source gate: Odoo's `timesheets_analysis_report_form` defines the project/task
relation fields at `addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46`;
the By Task action `timesheet_action_report_by_task` is defined at `:218-254`.

Core3 gate: `timesheets-by-task` remains page/API-separated. Its report
datasource now returns `project_id` and `task_id`, scopes rows to the active
company, and owns the manager-only `view_task_report_entry` navigation action.
The rendered row action opens the existing durable
`/task-timesheets?task_id=...` context, where the persisted task line is
visible. No duplicate report preview or new fixture table was introduced.

Focused gate: `bun test
test/timesheets_task_report_drilldown.integration.test.ts --timeout 20000`
passes 4 tests / 16 expectations. Migration replay/file-backed restart,
relation context, company/permission guards, deterministic empty state, source
contract, and no-moving-value checks pass. Authenticated Core3 desktop/mobile
evidence is in
`evidence/timesheets/2026-09-20/timesheet-task-report-drilldown/`; both
viewports navigate from the rendered row to the task context without page
errors, failed requests, or overflow.

Paired authenticated Odoo desktop/mobile evidence reaches
`/odoo/timesheets-by-task` and renders the aggregate report, but no loaded
row-to-task-timesheet action/form is exposed. The source form contract is
therefore recorded without claiming paired interaction parity. Remaining
route/action comparison and module sign-off remain pending.

## 2026-09-21 `TIMESHEET-PORTAL-MY-TIMESHEETS`

- Odoo source gate: authenticated `/my/timesheets` is declared in
  `hr_timesheet/controllers/portal.py:69-170`; its portal template renders the
  Date, Employee, Project, Task, Description, and Time Spent columns.
- Core3 gate: page/API are joined by `page.id: timesheets-portal`; the durable
  API is company and signed-in employee scoped, while the `timesheets.read`
  row action opens the existing own-scope detail route.
- Focused gate: `bun test test/timesheets_portal.integration.test.ts
  --timeout 20000` passes 4 tests / 29 expectations; ESLint and
  `git diff --check` pass.
- Browser gate: authenticated Core3 desktop/mobile and Odoo desktop/mobile
  evidence is in
  `evidence/timesheets/2026-09-21/timesheet-portal-my-timesheets/`; Core3
  renders and opens the durable row without errors or overflow.
- Blocker: Odoo's captured portal state has no row-to-detail action, so paired
  row-action parity remains open and no module sign-off is claimed.

## 2026-09-21 `TIMESHEET-MY-ANALYSIS-VIEWS`

Source gate: `hr_timesheet_views.xml:402-465` declares the personal action
view family `list,form,kanban,pivot,graph`; the personal pivot uses weekly date
rows with Time Spent and Timesheet Costs measures, and the personal graph uses
date/project/time fields (`:74-113`).

Core3 gate: `pages/entries.yaml` and `api/entries.yaml` remain separate and
join through `page.id: timesheets`. The page adds desktop-only Pivot and Graph
views; the API declares the pivot field set on the existing durable,
`timesheets.read`-protected, employee/company-scoped source. Existing detail
mutation concurrency remains required.

Focused gate: `bun test
test/timesheets_my_analysis_views.integration.test.ts
test/timesheets_my.integration.test.ts --timeout 20000` passes 7 tests / 59
expectations. ESLint, `git diff --check`, and `bun run audit` pass.

Browser gate: authenticated Core3 and Odoo desktop/mobile captures are in
`evidence/timesheets/2026-09-21/timesheet-my-analysis-views/`. Core3 desktop
Pivot and Graph render seeded values; Core3 mobile has no Pivot/Graph tabs and
fits 390px. Odoo desktop exposes and renders both controls; Odoo mobile loads
the responsive Kanban action and hides those desktop-only controls.

Blockers: the capture records only aborted navigation-prefetch/background
requests, with no page errors; these did not prevent the rendered states. The
broader Odoo Print/PDF/action gaps from the report slices remain open, so this
bounded feature does not claim Timesheets sign-off.

## 2026-09-21 `TIMESHEET-PORTAL-DATE-FILTERS`

- Source gate: `hr_timesheet/controllers/portal.py` defines All,
  Last Year/Quarter/Month/Week, Today, This Week/Month/Quarter/Year filters
  for authenticated `/my/timesheets`.
- Core3 contract gate: `pages/portal-timesheets.yaml` and
  `api/portal-timesheets.yaml` remain separate and join through
  `page.id: timesheets-portal`; the API uses fixed date windows over durable
  rows and retains `timesheets.read` actor/company scope.
- Focused gate: `bun test
  test/timesheets_portal_filtering.integration.test.ts
  test/timesheets_portal.integration.test.ts --timeout 20000` passes 8 tests /
  61 expectations. ESLint, diff-check, and audit are still required before
  commit.
- Persistence/security gate: date-window results survive a file-backed
  restart; wrong actor/company and empty fixture return no rows; a stale draft
  detail edit returns `409 STALE_RECORD`.
- Odoo evidence: authenticated desktop/mobile `/my/timesheets` exposes all
  source filter links and renders `filterby=last_month`; artifacts are under
  `evidence/timesheets/2026-09-21/timesheet-portal-filtering/`.
- Blockers: Core3 startup is blocked by the unowned Employees schema error
  `components[2].title is not allowed`, so no Core3 browser evidence is
  claimed. Odoo mobile visibly clips its dense table and records aborted
  background requests. Broader Timesheets Print/PDF/action gaps remain open.

## 2026-09-21 `TIMESHEET-PORTAL-SORTING`

- Source gate: Odoo `_get_searchbar_sortings` exposes Newest/date,
  Employee, Project, Task, and Description sort links on authenticated
  `/my/timesheets`; Sales Order Item and Invoice are also visible in the
  installed reference.
- Core3 contract gate: the portal page adds the supported sort filter choices;
  the separate API query orders durable rows by the requested field and keeps
  the `timesheets.read` employee/company guard.
- Focused gate: the three portal suites pass 12 tests / 88 expectations.
  ESLint and focused contract checks pass; final diff-check and audit are run
  before commit.
- Persistence/security gate: each sort order is deterministic, combines with
  date filtering, survives a file-backed restart, and retains wrong
  actor/company, empty fixture, permission, and `409 STALE_RECORD` guards.
- Odoo evidence: authenticated desktop/mobile source controls and
  `sortby=project_id` states are under
  `evidence/timesheets/2026-09-21/timesheet-portal-sorting/`.
- Blockers: Core3 route capture cannot start because shared discovery hits
  `SyntaxError: YAML Parse error: Unexpected token` in an unowned Ecommerce
  boundary (focused scan previously names `search.lots`/`search.or packages...`).
  Odoo mobile visibly clips its dense table; Sales Order Item/Invoice sort
  projection and broader Print/PDF/action parity remain open.

## 2026-09-21 `TIMESHEET-ALL-COMPANY-SCOPE`

- Source gate: Odoo's `analytic_line_comp_rule` restricts analytic lines to
  `company_ids`; the Timesheets approver rule remains project/domain scoped.
- Core3 gate: `all-timesheets` page/API contracts are separate and the durable
  list, detail read, and approver edit guard use the active
  `current_company_name`. The API exposes `company_name` for auditable scope.
- Focused gate: `test/timesheets_all_company_scope.integration.test.ts` plus
  `test/timesheets_all.integration.test.ts` pass 7 tests / 65 expectations.
  Coverage includes permission, source comparison, foreign-company exclusion,
  explicit company switching, file restart, foreign mutation denial, and
  `409 STALE_RECORD` concurrency.
- Browser gate: authenticated Core3 and Odoo desktop/mobile captures are in
  `evidence/timesheets/2026-09-21/timesheet-all-company-scope/`. Both routes
  rendered without page errors; Odoo aborted shared `/mail/data` prefetches are
  recorded in `results.json`.
- Blockers: the single browser company prevents visual company-switch proof;
  Core3 mobile visibly clips the wide list at 390px; existing Timesheets
  Print/PDF/action and broader route comparison gaps remain open. No module
  sign-off is claimed.
## `TIMESHEET-TASK-PROGRESS-001` — task progress context (2026-09-21)

- Source comparison: `hr_timesheet.models.project_task` computes effective
  time from analytic lines and exposes allocated, remaining, progress, and
  overtime fields. The captured Odoo task form/Timesheets tab confirms the
  corresponding visible context.
- Core3 contract: `api/task-timesheets.yaml` owns the guarded
  `task_timesheet_progress` query; `pages/task-timesheets.yaml` owns only the
  `Task progress` StatRow and remains joined by `page.id`.
- Persistence: migration
  `20260921100000-015-timesheets-task-progress.yaml` adds deterministic
  company, allocation, row-version, and timestamp state to the Timesheets
  task relation; replay is idempotent.
- Guards: `timesheets.read`, active company, empty/not-found fixture, and
  transport error; allocation row-version changes are reflected without
  stale cached totals.
- Focused verification: `bun test
  test/timesheets_task_progress.integration.test.ts
  test/timesheets_task.integration.test.ts
  test/timesheets_task_report.integration.test.ts
  test/timesheets_task_lines_report.integration.test.ts
  test/timesheets_task_report_preview.integration.test.ts --timeout 30000`
  — 19 passed, 0 failed, 107 expectations.
- Browser evidence:
  `evidence/timesheets/2026-09-21/timesheet-task-progress/`, authenticated
  Core3 and Odoo desktop/mobile; Core3 page/request errors are empty and both
  surfaces have 390px document width on mobile.
- Blockers: the Odoo reference uses a different seeded task and native time
  widget, so only field-level comparison is claimed. Existing Odoo
  Print/PDF/action blockers remain open; no module sign-off is claimed.
## `TIMESHEET-UOM-ENCODING-001` — company time encoding (2026-09-21)

- Source comparison: Odoo `res_config_settings.py` defines Hours/Minutes and
  Days/Half-Days and writes the company encoding UoM; `hr_timesheet.py` reads
  the company UoM for line/calendar display; the list/form source uses the
  `timesheet_uom` widget.
- Core3 contract: `api/entries.yaml` owns company-aware display formatting and
  raw/mode fields; `pages/entries.yaml` stays layout-only and exposes the
  existing Time Spent column through `page.id: timesheets`.
- Persistence: the new forward migration aligns the existing settings row to
  the active demo company with a fixed timestamp; the settings mutation keeps
  row-version concurrency.
- Guards: `timesheets.read` controls entry reads, `timesheets.settings`
  controls mode changes, the entry query is company-scoped, and stale settings
  writes fail without changing displayed values.
- Focused verification: UoM tests pass 4/4 with 24 expectations; the combined
  UoM, settings, and My Timesheets run passes 10/10 with 67 expectations; full Timesheets suite before shared discovery drift
  passed 132/132 with 864 expectations.
- Browser evidence:
  `evidence/timesheets/2026-09-21/timesheet-uom-encoding/` contains
  authenticated Odoo desktop/mobile captures and `results.json`.
- Blocker: Core3 browser capture cannot start because unrelated Inventory YAML
  fails discovery with `view_inventory_route_rules` unknown action and invalid
  ListView `title`/`variant` fields. Odoo is captured in Hours mode only; the
  live reference did not expose an authenticated Days-mode configuration in
  this run. Existing Print/PDF/action gaps remain open.

## `TIMESHEET-MY-WEEK-DEFAULT-001` — internal default week (2026-09-21)

- Source comparison: Odoo `act_hr_timesheet_line` opens `/odoo/timesheets`
  with `search_default_week`, `is_timesheet`, and `is_my_timesheets` context.
- Core3 contract: `pages/entries.yaml` adds the layout default
  `work_date: this_week`; `api/entries.yaml` remains the separate
  `page.id: timesheets` durable read contract with fixed deterministic week
  dates.
- Focused verification: `test/timesheets_my_week_default.integration.test.ts`
  passes 4/4 tests with 19 expectations. Coverage includes permissions,
  actor/company empty results, stale detail concurrency, migration replay, and
  file-backed restart.
- Evidence: authenticated Odoo desktop/mobile captures are under
  `evidence/timesheets/2026-09-21/timesheet-my-week-default/`.
- Browser result: authenticated Core3 desktop/mobile render `Date: This Week`
  at 1440x900 and 390x844 with no page errors or horizontal overflow. Only
  aborted background prefetches for unrelated All Timesheets surfaces are
recorded. Existing Timesheets Print/PDF/action blockers remain.

## `TIMESHEET-PARENT-TASK-GROUP-001` — authenticated My Timesheets Parent Task group-by (2026-09-21)

- Source gate: Odoo stores `parent_task_id` on the analytic line and adds a
  `Parent Task` group-by filter to the authenticated Timesheets search view.
- Core3 gate: the layout-only `pages/entries.yaml` and API-owned
  `api/entries.yaml` remain joined by `page.id: timesheets`; migration
  `0.0.17` durably backfills deterministic parent IDs/names and the ListView
  exposes `Parent Task` grouping.
- Focused gate: `test/timesheets_parent_task_group.integration.test.ts`
  passes 4/4 tests / 24 expectations, including page/API separation,
  permission, actor/company/empty scope, stale concurrency, replay, and
  file-backed restart.
- Odoo browser gate: authenticated `codex@core3.local` renders
  `/odoo/timesheets` at 1440x900; opening the search panel visibly exposes
  `Group By` → `Parent Task`. The authenticated 390x844 Kanban state hides
  the desktop search panel. Captures and machine-readable results are under
  `evidence/timesheets/2026-09-21/timesheet-parent-task-group/`.
- Core3 browser blocker: shared discovery fails before login on an unrelated
  page schema (`PageSchemaError: components[0].views[0].group_by is required
  for kanban`); no other module was repaired or staged. Existing Odoo
  Print/PDF/action blockers remain open and this slice is not sign-off.

## `TIMESHEET-MY-TOTAL-FOOTER-001` — My Timesheets Time Spent total (2026-09-21)

- Source gate: Odoo's `hr_timesheet_line_tree` declares the Time Spent
  `unit_amount` field with `sum="Total"` and the `timesheet_uom` widget.
- Core3 gate: `pages/entries.yaml` remains layout-only and binds a `Total`
  footer through `page.id: timesheets` to API-owned
  `timesheet_entries_summary`; the summary uses the same durable actor,
  company, search, state, and date scope as the list.
- Focused gate: `test/timesheets_my_total_footer.integration.test.ts`
  passes 4/4 tests / 23 expectations, including page/API separation,
  permission, company/empty/transport guards, stale concurrency, replay, and
  file-backed restart.
- Odoo browser gate: authenticated `codex@core3.local` renders
  `/odoo/timesheets` at desktop with the visible `127:00` total; the mobile
  Kanban renders authenticated cards but does not expose the list footer.
  Captures and results are under
  `evidence/timesheets/2026-09-21/timesheet-my-total-footer/`.
- Core3 browser blocker: the bounded `bun dev --db=ddb --memory` startup
  exposed Vite on 3002 but did not expose backend 3001 before the process was
  stopped; no other module was repaired or staged. Existing Odoo Print/PDF/
  action blockers remain open and this slice is not sign-off.

## `TIMESHEET-MY-DEPARTMENT-GROUP-001` — My Timesheets Department grouping (2026-09-21)

- Source gate: Odoo stores analytic-line `department_id` from the employee
  relation and exposes `groupby_department` in the authenticated Timesheets
  search view.
- Core3 gate: the layout-only page adds `Department` to the ListView group-by;
  the API adds durable employee department identity/name to the list/pivot
  projection through `page.id: timesheets`.
- Focused gate: `test/timesheets_my_department_group.integration.test.ts`
  passes 4/4 tests / 28 expectations, including relation reads,
  actor/company/empty guards, stale concurrency, replay, and file restart.
- Odoo browser gate: authenticated desktop opens and applies Department
  grouping; authenticated mobile captures the responsive Kanban without the
  desktop search control. Captures and results are under
  `evidence/timesheets/2026-09-21/timesheet-my-department-group/`.
- Core3 browser blocker: backend `127.0.0.1:3001` did not accept
  `/api/modules` during the bounded startup probe; exact output is in
  `core3-readiness.txt`. Odoo Print/PDF/action blockers remain open and this
  slice is not sign-off.
## `TIMESHEET-MY-MANAGER-GROUP-001` — My Timesheets Manager grouping (2026-09-21)

- Source gate: Odoo stores analytic-line `manager_id` from the employee's
  `parent_id` and exposes `groupby_manager` in the authenticated Timesheets
  search view.
- Core3 gate: the layout-only page adds `Manager` to the ListView group-by;
  the API adds durable employee manager identity/name to the list/pivot
  projection through `page.id: timesheets`.
- Focused gate: `test/timesheets_my_manager_group.integration.test.ts`
  passes 4/4 tests / 28 expectations, including relation reads,
  actor/company/empty guards, stale concurrency, replay, and file restart.
- Odoo browser gate: authenticated desktop applies Manager grouping and
  renders the grouped result; authenticated mobile captures responsive Kanban
  without the desktop search control. Captures and results are under
  `evidence/timesheets/2026-09-21/timesheet-my-manager-group/`.
- Core3 browser blocker: `discoverPages` rejects an unrelated page's
  `actions[2].fields[*].max_length`; exact output is in `core3-readiness.txt`.
  Odoo Print/PDF/action blockers remain open and this slice is not sign-off.

## `TIMESHEET-ALL-EMPLOYEE-GROUP-001` — All Timesheets Employee grouping (2026-09-21)

- Source gate: Odoo's All Timesheets action is `timesheet_action_all`; its authenticated search view exposes `groupby_employee` over `employee_id`.
- Core3 gate: `all-timesheets` keeps page/API YAML separate, adds durable `employee_id` to list/pivot data, and exposes the relation in the page metadata.
- Focused gate: `test/timesheets_all_employee_group.integration.test.ts` passes 4/4 tests / 23 expectations, including relation reads, actor/company/empty guards, stale concurrency, and file restart.
- Odoo browser gate: authenticated desktop applies Employee grouping and renders the grouped result; authenticated mobile captures responsive Kanban without the desktop search panel. Captures and results are under `evidence/timesheets/2026-09-21/timesheet-all-employee-group/`.
- Core3 browser blocker: shared startup fails before authentication because `discoverPages` rejects `actions[2].fields` without a non-empty array; exact output is in `core3-readiness.txt`. Odoo Print/PDF/action blockers remain open and this slice is not sign-off.

## `TIMESHEET-ALL-CALENDAR-MULTI-CREATE-001` — All Timesheets calendar multi-create (2026-09-21)

- Source gate: Odoo's All Timesheets action binds its calendar view to the multi-create form `view_calendar_account_analytic_line_multi_create`.
- Core3 gate: `all-timesheets` keeps page/API YAML separate, adds manager permission and active employee/company/relation guards, and persists the batch plus daily entries through the existing calendar schema.
- Focused gate: `test/timesheets_all_calendar_multi_create.integration.test.ts` passes 4/4 tests / 25 expectations, including no-partial-write and file restart coverage.
- Odoo browser gate: authenticated desktop calendar and mobile Kanban captures are under `evidence/timesheets/2026-09-21/timesheet-all-calendar-multi-create/`; both have no page errors. The multi-create dialog was not exposed by a standard desktop toolbar button and is not claimed.
- Core3 browser blocker: shared startup fails before authentication because `discoverPages` rejects `components[1].title`; exact output is in `core3-readiness.txt`. Odoo Print/PDF/action blockers remain open and this slice is not sign-off.
