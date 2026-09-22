# Time Off QA ledger

Module owner: time-off module owner
QA event: bounded candidate review
Candidate: `6300ab0a`
Worktree: `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`
Date: 2026-09-13
Tester decision: conditional pass; reviewer sign-off required

## Evidence

- Deletion tests: **PASS**, 4 tests / 24 assertions; Draft, missing,
  non-Draft, stale, and repeated-delete guards pass.
- Role declaration: **PASS**; deletion requires `time_off.write` and actor
  `time_off.manage` tiers remain explicit.
- Restart persistence: **PASS** across file-backed DuckDB close/reopen and
  migration rerun.
- Full focused suite: **PASS**, 49 tests / 509 assertions across 18 files.
- Audit: **PASS**, 647 pages / 662 routes / 1,112 datasources.
- Frontend build and diff-check: **PASS**. Typecheck has pre-existing shared
  and unrelated service failures; no candidate file was implicated. No local
  lint command was available.

## Blockers

- Live Core3 failed to bind `127.0.0.1:3001`; live actor HTTP enforcement was
  not revalidated.
- Playwright/js_repl was unavailable; no authenticated Core3 desktop/mobile
  candidate captures were obtained.
- Paired authenticated Odoo desktop/mobile comparison remains pending.
- Pre-existing repository typecheck failures and unavailable local lint remain
  conditional quality blockers.

Disposition: conditional bounded pass only. Preserve blockers; no full Time Off
module sign-off or aggregate progress claim.

## 2026-09-13 coordinator review: candidate `691bb590`

- Integrated only the bounded refusal-reason migration/forms/guards/detail
  slice as `c6c209c1` on the active branch. The candidate is confined to
  Time Off API/page contracts, one migration, and focused tests; no shared
  runtime or unrelated work was imported.
- Post-merge refusal test passed: **2 tests, 20 assertions**. Candidate
  evidence remains **51 tests, 529 assertions**; audit (**647 pages, 662
  routes, 1112 datasources**), frontend build, and diff-check passed.
- Refusal reason persistence, manager-only forms, required-reason validation,
  stale/non-Submitted guards, and refused-detail display are accepted for this
  bounded slice. Typecheck and lint remain conditional blockers.
- Time Off remains **conditional / unsigned-off**. Core3 listener failure,
  unavailable `js_repl`/Playwright, role-matrix checks, authenticated
  desktop/mobile evidence, and paired Odoo comparison remain open.
## 2026-09-13 coordinator dispatch — bounded balance persistence wave

## QA-pending allocation-balance candidate `047cbd03` (2026-09-13)

- Existing owner/worktree: `agent/time-off-draft-delete-20260913` at
  `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`;
  candidate is not merged and awaits existing Time Off QA.
- Coordinator evidence: allocation/balance suite **2 tests / 19 assertions**
  and audit **647 pages / 662 routes / 1,112 datasources** pass. Candidate
  build, targeted lint, and diff-check confirmation remain with QA.
- Browser actor/restart, paired Odoo, typecheck/lint, Temporal, and broader
  workflow/CRUD gates remain open.

- Existing owner `agent/time-off-draft-delete-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`, based
  at `691bb590`. Development event: `DEV-TIME-OFF-WAVE-20260913-R2`; QA event:
  `QA-TIME-OFF-WAVE-20260913-R2`; handoff commit: `f8dab29a`.
- Scope is allocation/balance persistence across file-backed restart and
  migration replay, with recalculation, validation, scope, stale, and atomic
  guards plus focused tests. Candidate pending; existing ledger and aggregate
  progress are preserved.

## Reviewer reconciliation `047cbd03`: conditional bounded PASS (2026-09-13)

- Existing owner/worktree was valid: `agent/time-off-draft-delete-20260913` at
  `/home/nhanjs/projects/core3-worktrees/time-off-draft-delete-20260913`.
  The bounded allocation-balance candidate integrated as `c4250943`; its
  progress-ledger conflict was resolved by preserving the active ledger.
- Post-merge verification passed **53 tests / 550 assertions** across 20 files,
  including balance persistence/reopen **2 tests / 19 assertions**. Audit passed
  **661 pages / 670 routes / 1,158 datasources**; frontend build and diff-check
  passed. QA reports targeted ESLint also passed.
- Accepted evidence covers allocation balance application/idempotency,
  row-version and workflow recalculation, CRUD/permissions, authenticated
  desktop/mobile rendering, reload and file-backed reopen persistence.
- Temporal is **not applicable** to the synchronous local workflow; no durable
  external workflow boundary is configured.
- Disposition: **conditional bounded PASS; integrated**. Fresh authenticated
  paired Odoo comparison remains open. No full Time Off sign-off.

## 2026-09-22 bounded candidate: overview calendar event detail

- Focused test: **PASS**, 3 tests / 22 assertions in
  `test/time_off_overview_calendar_detail.integration.test.ts`.
- Persistence: **PASS**; migration/index replay is idempotent and approval
  remains persisted after DuckDB close/reopen.
- Contract: **PASS**; matching page/API ids, Overview row-open navigation,
  calendar-visible state filtering, and `time_off.manage` workflow guards.
- Source comparison: **PASS** against
  `/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_leave_report_calendar.xml`.
- Odoo browser gate: **BLOCKED**; `core3_reference` has no Time Off menu or
  `hr_holidays` action, and direct `/odoo/time-off` resolves to Discuss.
  Blocker captures are in the linked evidence README; no Odoo mutation was
  made.
- Disposition: **conditional bounded PASS**; no full module sign-off.

## 2026-09-22 bounded candidate: My Allocations Activity view

- Source action: Odoo `hr_leave_allocation_action_my`, view modes
  `list,kanban,form,activity`; activity view
  `hr_leave_allocation_view_activity`.
- Core3 route: `/my-allocations`, page/API `page.id: my-allocations`.
- Focused test: **PASS**, 3 tests / 19 assertions in
  `test/time_off_my_allocations_activity.integration.test.ts`.
- Full Time Off regression: **PASS**, 66 tests / 669 assertions across 24
  integration files. Frontend build, Time Off CSS build, and diff-check pass.
- Persistence: **PASS**; migration `0.0.23` is replay-safe, seeded slots and
  scheduled activity survive file-backed close/reopen, and new allocation
  creation inserts a durable slot.
- Odoo browser gate: **BLOCKED**; authenticated `core3_reference` has no Time
  Off menu and `/odoo/my-time-off` resolves to Discuss. Desktop/mobile blocker
  captures are in the linked evidence README.
- Core3 browser gate: **BLOCKED**; `agent:module` exits before binding at
  `yaml-api.ts:259` with `Conflicting declarations for named action:
  time_off.requests.refuse`.
- Disposition: **conditional bounded PASS**; no visual parity claim or full
  Time Off sign-off.

The full Time Off glob was also run after the focused pass: **52 passed, 9
failed, 449 assertions across 61 tests**. The nine failures are existing
discovery assertions reporting the shared page-schema error
`components[1].tabs[3].fields is not allowed`; the new overview calendar test
passes and no shared/schema or other module path was changed to mask this
blocker.

## 2026-09-22 bounded candidate: accrual-plan employee stat

- Focused test: **PASS**, 2 tests / 18 assertions in
  `test/time_off_accrual_plan_employees.integration.test.ts`.
- Persistence: **PASS**; migration `0.0.22` and its index replay idempotently,
  and the plan-to-employee relation remains queryable after DuckDB close/reopen.
- Contract: **PASS**; conditional Employees stat, matching page/API ids,
  manager-only read datasource/action, stable grouping, search, empty, and 503
  transport states are covered.
- Source comparison: **PASS** against
  `hr_leave_accrual_plan.py` and `hr_leave_accrual_views.xml` in local Odoo 19.
- Odoo browser gate: **BLOCKED**; `core3_reference` has no Time Off menu or
  accrual-plan action and direct `/odoo/time-off` resolves to Discuss. Core3
  browser startup is separately blocked by the unrelated dirty
  `services/fleet/api/vehicles.yaml` YAML parse error. Evidence details are in
  `evidence/time-off/2026-09-22/TIMEOFF-ACCRUAL-PLAN-EMPLOYEES-001/README.md`.
- Full Time Off regression: **PASS**, 63 tests / 650 assertions across 23
  integration files; the earlier fixed multi-view inventory now includes the
  new employee surface.
- Disposition: **conditional bounded PASS**; no full Time Off sign-off.

## 2026-09-22 bounded candidate: second approval workflow

- Source workflow: Odoo `hr.leave.action_approve`, states `confirm`,
  `validate1`, `validate`; leave type validation `both`.
- Core3 surfaces: `/time-off/leave-request-detail`, `/time-off-approval`, and
  `/time-off-overview/detail`; matching page/API IDs remain separate.
- Focused test: **PASS**, 3 tests / 20 assertions in
  `test/time_off_second_approval.integration.test.ts`.
- Full Time Off regression: **PASS**, 69 tests / 689 assertions across 25
  integration files.
- Persistence: **PASS**; migration `0.0.24` is idempotent, first/second
  approver audit survives file-backed close/reopen, and final validation
  applies balance once.
- Permission/workflow guards: **PASS**; first approval and Validate require
  `time_off.manage`, current row version, `both` validation mapping, and valid
  balance.
- Odoo browser gate: **BLOCKED**; authenticated `core3_reference` has no Time
  Off menu or `hr_holidays` action and direct approval navigation resolves to
  Discuss. No paired desktop/mobile visual claim is made.
- Evidence: `evidence/time-off/2026-09-22/TIMEOFF-SECOND-APPROVAL-001/`.
- Disposition: conditional bounded PASS; no full Time Off sign-off.

## 2026-09-22 bounded candidate: Time Off Analysis report action

- Source action: Odoo `hr_leave_report_action` from
  `addons/hr_holidays/report/hr_leave_reports.xml`; Graph/Pivot
  `hr.leave.report` allocation/request union.
- Core3 route: `/time-off-analysis`, page/API `page.id: time-off-analysis`.
- Focused test: **PASS**, 3 tests / 17 assertions in
  `test/time_off_analysis.integration.test.ts`.
- Persistence: **PASS**; migration `0.0.25` adds report metadata and both
  analysis indexes, and replay is idempotent.
- Contract: **PASS**; signed days/hours, employee/type/month dimensions,
  department/company context, filters, empty state, 503 state, and read-only
  permission boundary are covered.
- Odoo browser gate: **BLOCKED**; BrowserSkill instance `245ea108` loaded
  `/odoo/time-off` as Discuss at desktop/mobile. Captures and exact details are
  in `evidence/time-off/2026-09-22/TIMEOFF-ANALYSIS-001/`.
- Core3 browser gate: **BLOCKED** by the task-created BrowserSkill tab's 401
  response from `/api/auth/me`; no independent Core3 login was attempted and
  no credential-bearing screenshot was retained.
- Disposition: conditional bounded PASS; no paired visual parity or full module
  sign-off.

## 2026-09-22 bounded candidate: By Employee report row drilldown

- Stable ID: `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001`.
- Source action: Odoo `action_hr_available_holidays_report`, whose
  `list,graph,pivot,calendar,form` modes target `hr.leave`.
- Core3 contract: `pages/report-by-employee.yaml` and
  `api/report-by-employee.yaml`, joined by `page.id:
  time-off-report-by-employee`.
- Focused test: **PASS**, 2 tests / 12 assertions in
  `test/time_off_report_employee_drilldown.integration.test.ts`.
- Regression: **PASS**, 74 tests / 718 assertions across the Time Off glob.
- Persistence/guards: **PASS by reuse**; the row carries the durable
  `leave_requests.id` into the existing request detail datasource, retaining
  its 404/503 and `time_off.read` boundary.
- CSS/frontend/diff checks: **PASS**; Time Off CSS build, complete frontend
  build, and `git diff --check`.
- Odoo browser gate: **BLOCKED before navigation**; the normal authenticated
  Odoo tab on BrowserSkill instance `245ea108` was already borrowed by another
  session. A pending existing PDF-tab borrow was cancelled. No Odoo mutation
  or visual-parity claim was made.
- Disposition: conditional bounded pass; no full Time Off sign-off.
