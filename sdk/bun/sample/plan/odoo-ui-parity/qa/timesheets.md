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
