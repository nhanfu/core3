# employees parity progress

Module owner: employees module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress

## EMP-LAUNCH-PLAN-001 (2026-09-20)

- Selected gap: Odoo employee-form `plan_wizard_action` / Launch Plan.
- Implemented page/API-separated wizard and eligible-plan datasource, durable
  plan/responsible provenance migration, atomic ordered activity expansion, and
  row-version/company/actor guards.
- Verification: focused `4 passed / 33 assertions`; full Employees
  `71 passed / 791 assertions`; YAML parse, scoped ESLint, diff-check, and
  audit `669 pages / 678 routes / 1,203 datasources` passed.
- Authenticated Core3 desktop/mobile and paired Odoo captures are under
  `evidence/employees/2026-09-20/EMP-LAUNCH-PLAN-001/`; the evidence records
  the current company fixture-name mismatch and narrow Odoo action visibility.
  Module status remains conditional pending broader parity review.
Verification trigger: feature-complete
Candidate commit: current working tree

## EMP-BANK-ACCOUNT-001 (2026-09-20)

- Selected the smallest remaining source-backed Personal-tab gap: employee
  bank accounts and salary allocation.
- Implemented migration 20260920230000-034, durable API line-item CRUD,
  actor/company/active/row-version guards, deterministic fixtures, and the
  Personal LineItemGrid page binding.
- Focused verification: 4 tests / 32 assertions; audit 679 pages / 688
  routes / 1,247 datasources.
- Authenticated Core3 and Odoo desktop/mobile captures are under
  evidence/employees/2026-09-20/EMP-BANK-ACCOUNT-001/. Core3 fixture
  company and authenticated company differ; Odoo's 24 reference employees
  have no bank accounts. Both comparison boundaries are explicit blockers,
  not sign-off.

## EMP-LOAD-SAMPLE-DATA-001 (2026-09-20)

- Selected the smallest remaining source-backed behavior after Print Badge:
  Odoo's empty Employees `action_hr_employee_load_demo_data` server action.
- Added YAML-first page/API separation, a company-scoped `employees.write`
  mutation, deterministic department and employee fixtures, an audit table
  migration, actor/company/empty-state guards, and migration-replay/restart
  coverage.
- Focused feature verification passes **3 tests / 21 assertions**. The module
  rerun reached **78 passed / 8 failed across 24 files**; the eight failures
  are the pre-existing shared Inventory page-discovery error for missing
  `create_inventory_quant`, `set_inventory_quantity`, and related actions.
  Employees feature tests pass; the repository audit is blocked by that same
  unrelated Inventory discovery error. Scoped ESLint and diff-check pass.
- Authenticated Core3 desktop/mobile captures pass after fixing the toolbar
  binding: Admin loaded three sample employees and reload/mobile retained them;
  Fleet received 403. Authenticated Odoo desktop/mobile captures pass for the
  seeded list with no errors, but the empty-state comparison is blocked because
  the reference company already has 24 employees. Evidence:
  `evidence/employees/2026-09-20/EMP-LOAD-SAMPLE-DATA-001/`.

Verification trigger: feature-complete with unrelated shared Inventory audit blocker
Candidate commit: pending local commit

## EMP-BARCODE-GENERATE-001 (2026-09-20)

- Selected the smallest remaining source-backed Employee gap: Odoo Settings
  `generate_random_barcode` / Generate control.
- Implemented page/API-separated `generate_employee_barcode`, durable
  `employees.barcode` update with row-version increment, actor/company/active
  guards, Odoo-compatible format/length/uniqueness checks, and migration
  `20260920200000-031-employee-barcode-generation.yaml`.
- Focused verification currently passes **4 tests / 23 assertions**. The
  initial invalid-generation failure was traced to mutation guard ordering
  (`before_steps` run after guards); generation is now assigned in the
  actor/company-scoped guard before validation.
- Authenticated Odoo Settings evidence passes desktop/mobile. Authenticated
  Core3 desktop/mobile evidence is an exact blocker: session company `Core3
  Demo Company` does not match fixture company `Core3 Vietnam`; no UI pass is
  claimed. Evidence: `evidence/employees/2026-09-20/EMP-BARCODE-GENERATE-001/`.
- Full verification passes **65 tests / 658 assertions** across 21 Employees
  integration files; UI audit passes **673 pages / 682 routes / 1,219
  datasources**; focused ESLint and `git diff --check` pass. Evidence details
  are in `verification.md`.
- Verification trigger: feature-complete pending Employees-only staging and
  commit.

## EMP-PRINT-BADGE-001 (2026-09-20)

- Selected the smallest remaining source-backed behavior after Badge ID
  generation: Odoo's `hr_employee_print_badge` employee QWeb-PDF report.
- Implemented page/API-separated employee detail Print Badge action, dedicated
  `/employees/badge` page, durable `employee_badge_print_runs` migration and
  index, permission/company/actor/barcode/row-version guards, and print-history
  restart coverage.
- Focused verification passes **4 tests / 30 assertions**; `bun run audit`
  passes **675 pages / 684 routes / 1,225 datasources**.
- Authenticated Odoo desktop/mobile comparison passes; desktop produced the
  real `Badge - Abigail Peterson.pdf` download. Core3 desktop/mobile is an
  exact pre-auth blocker: shared Auth discovery rejects `action` and `refresh`
  keys in `services/auth/auth-module.ts`. Evidence:
  `evidence/employees/2026-09-20/EMP-PRINT-BADGE-001/`.
- Full Employees rerun records **57 pass / 12 fail across 69 tests**; all 12
  failures are the same unrelated shared Surveys duplicate
  `print_survey_results` discovery error. Employees-scoped ESLint and diff-check
  pass. No other module files are being changed or staged.

## EMP-ROUTE-CRUD-GATE-001 (2026-09-20)

- Completed authenticated parameterized matrix: 28/28 routes at desktop and
  28/28 at mobile on clean committed HEAD `cac5db24`; settled checks had no
  page errors, failed requests, HTTP errors, blank states, or overflow.
- CRUD smoke created `EMP-GATE-001`, edited it, archived it, restored it, and
  captured created/edited/archived/restored desktop states.
- Actor matrix: Admin allowed; Fleet received 403 for settings and employee
  detail; unauthenticated settings redirected to login.
- Paired Odoo Employees list/detail captured desktop/mobile with no failed
  requests or page errors. Evidence is in
  `evidence/employees/2026-09-20/EMP-ROUTE-CRUD-GATE-001/`.
- Shared checkout runtime was schema-blocked by another owner's uncommitted
  Timesheets page; verification used a temporary clean runtime of this
  committed HEAD and did not alter or stage that owner.

## QA-4 candidate verification (2026-09-13)

Exact candidate `3c28ad98` was tested in isolated worktree
`qa-employees-candidate-3c28ad98`. The focused Employees corpus passed with 52
tests and 634 assertions across 16 files. Authenticated desktop browser smoke
at 1440x900 loaded the Employees list/detail surface without page errors,
failed requests, HTTP errors, or overflow; the real New employee form created
`QA Browser Employee` and returned HTTP 200 with persisted-in-runtime card
visibility. Mobile mutation, edit/archive/restore, actor/company boundaries,
restart persistence, full empty/error matrix, and paired Odoo comparison were
not covered by this QA event and remain open.

## Current state

The focused Employees suite passes 52 tests across 16 files with 634
assertions. DEV-4 added and verified the primary employee create/edit/archive/
restore lifecycle: deterministic employee-number IDs, required and duplicate
guards, missing-record and stale-write protection, and active-state guards.
An authenticated module-scoped route smoke covered 27 routes at
desktop and mobile; valid-ID retests for the affected certification, departure
reason, work location, and working schedule detail states passed without
browser/request errors. Fleet was denied the manager-only settings route with
HTTP 403. Full parameterized route coverage and paired Odoo comparison remain
open. No parity claim is made here.

## Next bounded task

Run the complete parameterized route matrix, authenticated employee/catalog
CRUD smoke against the primary employee mutation, actor matrix, and paired
Odoo desktop/mobile captures. Update this file only with evidence from the
matching module owner.

## Bounded QA retest: candidate 6a4da038 (2026-09-13)

Focused Employees QA passed: 53 tests, 647 assertions, 0 failures across 16
files. The repaired Directory list query passed active and archived Core3
company scoping, archived Other Company filtering, and cross-company detail
denial. The company-scoped lifecycle test passed wrong-company restore denial
with `404 EMPLOYEES_RECORD_NOT_FOUND` and unchanged persistence, followed by
same-company restore to active=true at row version 4.

The full `bun test ./test --timeout 20000` run was stopped with SIGINT (exit
130) at finalization and is incomplete. UI audit passed at 659 pages, 669
routes, and 1,134 datasources; Employees test ESLint and diff-check passed. No
fresh authenticated desktop/mobile or paired Odoo captures were available;
prior captures are explicitly non-candidate evidence. Status remains
conditional/qa-in-progress, with full regression and fresh browser/Odoo
evidence blocked; no aggregate progress or sign-off claim is changed.

## Coordinator reconciliation: departure-reasons `382a3d30` (2026-09-13)

The active branch already contains the exact bounded repair, so no duplicate
merge was needed. It restores departure-reason Archive/Restore contracts and
page bindings, adds active/status projections, and maps edit/archive/restore
concurrency to `expected_row_version`. Active focused verification passed **12
tests / 167 assertions** and audit passed **661 pages / 670 routes / 1,154
datasources**. Status remains conditional; browser, broader actor/restart, and
paired Odoo gates remain open.

## Coordinator reconciliation: departure-reasons navigation `1dc77ba2` (2026-09-13)

The active branch already contains the exact bounded repair, so no duplicate
merge was needed. It adds the generated-ID collision 409 guard and disables
click-to-edit so row navigation reaches the detail route, with focused shared
renderer support. Departure Reasons passed **3 tests / 60 assertions**; full
Employees passed **12 / 167**; audit passed **661 / 670 / 1,154**. Status remains
conditional pending browser lifecycle, broader actor/restart, and paired Odoo
evidence.

## Reviewer reconciliation: final Departure Reasons browser PASS with blockers (2026-09-13)

Integrated commits `382a3d30`/`1dc77ba2` are active and ownership/diff/warning
checks are valid. Final browser evidence passes bounded desktop/mobile CRUD,
navigation, duplicate 409, archive/restore, stale 409, missing delete 404, and
manager/ordinary-user boundaries. QA is **3/60 focused**, full Employees
**12/167**, audit **661/670/1,154**. Company-switch and paired Odoo comparison
remain open.

## Reviewer reconciliation: company-scope follow-up `5707df6b` (2026-09-13)

`5707df6b` is already active at `HEAD`; no duplicate merge was required. The
company-scope migration, predicates, guards, and tests are present. Active QA
passes **13/175 focused** and **57/684 full**, with audit **661/670/1,154** and
lint/diff-check evidence passing. Company switch still returns HTTP 200 while
the bearer token and rows remain scoped to the old company; Odoo `admin/admin`
returns HTTP 400. Employees remains conditional pending token refresh and
authenticated Odoo comparison.

## Final company/Odoo runtime reconciliation (2026-09-13)

Core3 backend/frontend returned 200 with mediator listening. Authenticated Demo
admin switching produced exactly two Vietnam-only rows, then exactly three Demo
rows (`Fired`, `Resigned`, `Retired`); desktop/mobile Core3 checks passed. Odoo
Employees loaded desktop/mobile. A distinct `/api/query` request was not
observed, and Odoo Departure Reasons list/detail/action was not reached, so
those evidence gaps remain open. Employees status remains conditional.

## Reviewer reconciliation: deterministic company fixtures `0a04f9ac` (2026-09-13)

`0a04f9ac` is active at `HEAD`; no duplicate merge was needed. Migration
`20260913140000-026` seeds two deterministic Vietnam Branch departure reasons,
and page/`/api/query` tests now assert Demo versus Vietnam rows. Full Employees
passes **58/697**, audit **661/670/1,154**, targeted ESLint and diff-check pass.
Full-repo lint retains three unrelated Spreadsheet/Website errors. Company
switch token refresh and authenticated Odoo comparison remain open.

## Reviewer reconciliation: datasource company propagation `77bebdf5` (2026-09-13)

`77bebdf5` is already active; no duplicate merge was needed. Shared `/api/pages`
and `/api/query` now pass authenticated `current_company_name`. Focused QA
passes **2/13**, full Employees **58/692**, audit **661/670/1,154**, with lint
and diff-check passing. Real company-switch token refresh remains blocked
(HTTP 200 switch but old bearer scope/unchanged rows); Odoo `admin/admin`
returns HTTP 400. Employees remains conditional.

## Reviewer reconciliation: final Odoo/company QA handoff (2026-09-13)

Authenticated Odoo `hr.menu_hr_departure_reason_tree` → `/odoo/action-400` and
Core3 desktop/mobile lists both showed Fired, Resigned, and Retired; Core3
detail Edit/Archive and Odoo create/inline-edit were reachable. Company context
remains verified. Status is **PASS for list/company context, PARTIAL for full
parity**: no distinct browser `/api/query` request was observed, and Odoo
Departure Reasons detail/action state was not reached. No full sign-off.

## EMP-TEMPLATE-LOAD-001 (2026-09-20)

- Selected gap: Odoo employee Payroll `hr_version_wizard_action` / Load a Template.
- Added page/API-separated employee action and eligible-template datasource;
  migration `20260920190000-030-employee-template-load.yaml` persists template
  provenance on the employee and active contract version.
- Guards require `employees.write`, active/current-company employee scope,
  eligible active template, and the employee row version. Focused coverage
  includes migration replay and file-backed restart.
- Verification: focused **4 tests / 26 assertions**; full Employees **75 tests /
  817 assertions**; audit **671 pages / 680 routes / 1,216 datasources**;
  scoped ESLint and diff-check passed.
- Evidence: `evidence/employees/2026-09-20/EMP-TEMPLATE-LOAD-001/`.
  Authenticated Odoo desktop/mobile Payroll and modal captures pass. Core3
  desktop/mobile is an exact blocker: Admin session company is `Core3 Vietnam
  Branch`, deterministic Employees fixtures are `Core3 Vietnam`, and the list
  is empty. No UI pass or module sign-off claimed.

Verification trigger: feature-complete with authenticated Core3 fixture-scope blocker
Candidate commit: current working tree
