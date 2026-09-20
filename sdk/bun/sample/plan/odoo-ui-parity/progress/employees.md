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

## EMP-RESUME-LINES-001 (2026-09-20)

- Selected Odoo `hr.resume.line` employee-form `resume_line_ids` and
  `resume_one2many` CRUD after skill assignments.
- Implemented migration `20260920300000-040`, deterministic section/employee
  fixtures, API catalog/datasource, page/API-separated Resume-tab grid, and
  actor/company/type/date/duplicate/row-version guards.
- Verification: focused **4 tests / 30 assertions**, audit **687 / 696 /
  1,279**, scoped ESLint and diff-check pass.
- Core3 authenticated desktop/mobile company switch returned 200 but the
  Vietnam fixture is hidden in the Vietnam Branch session. Odoo authenticated
  Resume desktop/mobile navigation succeeded, but no populated reference
  resume lines were available. Evidence is conditional.
- Evidence: `evidence/employees/2026-09-20/EMP-RESUME-LINES-001/`.

## EMP-EMPLOYEE-SKILLS-001 (2026-09-20)

- Selected Odoo `hr.employee.skill` current-skill assignments after birth
  identity; source action is `open_hr_employee_skill_modal` on the
  `skills_one2many` Work-tab widget.
- Implemented durable assignment migration `20260920290000-039`, deterministic
  fixtures, API catalogs/datasource, page/API-separated Work-tab grid, and
  actor/company/relation/date/duplicate/row-version guards with archive.
- Focused verification: **4 tests / 27 assertions**, audit **686 / 695 /
  1,272**, scoped ESLint and diff-check pass.
- Core3 authenticated desktop/mobile company switch returned 200, but the
  Vietnam fixture is hidden in the Vietnam Branch session. Odoo authenticated
  desktop/mobile Work-tab was reached, but no populated Skills widget was
  present in the reference employee. Evidence is conditional.
- Evidence: `evidence/employees/2026-09-20/EMP-EMPLOYEE-SKILLS-001/`.

## EMP-BIRTH-IDENTITY-001 (2026-09-20)

- Implemented Odoo Personal birth identity parity: place of birth, country of
  birth, and gender, with migration `20260920280000-038`, deterministic
  fixtures, page/API-separated CRUD, and male/female/other validation.
- Verification: focused **4 tests / 21 assertions**, audit **684 / 693 /
  1,264**, scoped ESLint and diff-check pass.
- Authenticated Core3 desktop/mobile labels render without page/HTTP errors;
  values are blocked by the Vietnam fixture versus Vietnam Branch session
  company. Authenticated Odoo Personal desktop/mobile renders Place of Birth
  and Gender; exact Country of Birth is not visible and is recorded as a
  comparison blocker.
- Evidence: `evidence/employees/2026-09-20/EMP-BIRTH-IDENTITY-001/`.
- Conditional evidence only; no aggregate module sign-off.

## EMP-FAMILY-INFO-001 (2026-09-20)

- Selected the smallest remaining source-backed Personal behavior: Odoo
  Family information (`marital`, spouse name/birthdate, dependent children).
- Added migration 036, deterministic fixtures, page/API-separated fields,
  employee create/edit/read CRUD, validation, company/stale guards, and
  migration replay/file-backed restart coverage.
- Verification: focused 4 tests / 24 assertions; audit 681 pages / 690
  routes / 1,256 datasources; scoped ESLint and diff-check pass.
- Authenticated Core3 and Odoo desktop/mobile evidence passes. Odoo's one
  aborted desktop chatter request and app-icon 404s are documented as
  unrelated reference-shell noise.

## EMP-EDUCATION-001 (2026-09-20)

- Implemented Odoo Personal Education (`certificate`, `study_field`) with
  migration 037, deterministic fixtures, separated page/API contracts,
  employees.write/company/stale/invalid guards, CRUD, replay, and restart tests.
- Focused: **4 passed / 21 assertions**; merged schema, scoped ESLint, and
  diff-check pass.
- Full Employees: **75 passed / 12 failed / 748 assertions**; failures are
  existing shared `actions[0].title is not allowed` discovery errors. Audit is
  blocked by the same error.
- Core3 browser is blocked before authentication; Odoo labels are verified in
  the authenticated Family desktop/mobile capture. No module sign-off claimed.

## EMP-EMERGENCY-CONTACT-001 (2026-09-20)

- Selected the smallest remaining source-backed Personal-tab scalar behavior:
  Odoo Emergency Contact and Phone.
- Added migration 035, deterministic contact fixtures, page/API-separated
  fields, employee create/edit CRUD, permission/company/stale guards, and
  restart coverage.
- Verification: focused 3 tests / 21 assertions; full Employees 79 tests /
  762 assertions; audit 679 pages / 688 routes / 1,250 datasources; scoped
  ESLint and diff-check pass.
- Odoo authenticated desktop/mobile evidence passes for the Personal tab and
  Emergency Contact group. Core3 browser evidence is conditional because the
  shared runtime fails page discovery on unrelated `components[0].row_action`;
  the exact blocker is recorded without changing other module files.

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

## EMP-CREATE-USER-001 (2026-09-20)

- Completed the smallest unfinished source-backed employee action: Odoo's
  ERP-manager-only `hr.employee.action_create_user` form action. The durable
  YAML/API/migration workflow was already present in HEAD; this wave repaired
  the page visibility boundary so an empty or missing company-scoped employee
  cannot expose Create User, and retained the focused contract assertion.
- Focused verification: **4 tests / 30 assertions**; migration replay and
  file-backed restart pass. Scoped ESLint, audit, and diff-check are recorded
  for the final candidate commit.
- Authenticated Core3 desktop/mobile evidence has zero browser/request errors,
  but `employee-demo-001` is seeded for `Core3 Vietnam` while the Admin session
  is `Core3 Demo Company`; the employee and Create User modal are therefore
  correctly absent. Odoo authenticated desktop/mobile opens Abigail Peterson's
  modal and shows Name, Login, and Phone defaults. Seven Odoo app-icon 404s are
  unrelated shell noise.
- Evidence: `evidence/employees/2026-09-20/EMP-CREATE-USER-001/`.
  This is conditional feature evidence; no aggregate Employees sign-off is
  claimed.

## EMP-EMPLOYEE-VERSION-DETAIL-001 (2026-09-21)

- Selected the smallest remaining source-backed employee action: Odoo's
  clickable `hr.version` Employee Records row (`action_open_version`) after
  Create User and Resume Lines.
- Added page/API-separated `/employees/versions/detail` snapshot detail,
  guarded `employees.read`/current-company datasource, list row-open and
  double-click navigation, and Open employee navigation. Existing durable
  current/future/expired/archived fixtures are reused; no duplicate migration
  rows were introduced.
- Focused verification: **3 tests / 21 assertions**; migration replay,
  file-backed restart, company boundary, missing-record behavior, source
  mapping, and page/API separation pass. Audit: **690 pages / 699 routes /
  1,284 datasources**; scoped ESLint and diff-check pass.
- Core3 authenticated desktop/mobile list/detail routes load with zero browser
  or HTTP errors, but `Core3 Demo Company` has no `Core3 Vietnam` version
  fixtures, so populated snapshot values are unavailable. Odoo desktop shows
  28 records and opens Abigail Peterson's employee form from the version row;
  mobile reaches the authenticated resolved detail route. Evidence:
  `evidence/employees/2026-09-21/EMP-EMPLOYEE-VERSION-DETAIL-001/`.
- Evidence is conditional; no aggregate Employees sign-off is claimed.

## EMP-BANK-TRUST-001 (2026-09-21)

- Selected the smallest remaining source-backed employee action after version
  detail: Odoo `action_toggle_primary_bank_account_trust` beside the Personal
  bank-account row.
- Added the API mutation and page-only row action. It flips the durable
  `employee_bank_accounts.trusted` flag and increments both the bank row and
  employee row versions under `employees.write`, actor, active/current-company,
  parent-version, and line-version guards.
- Reused migration `20260920230000-034` for deterministic trusted fixtures;
  migration replay and file-backed restart are covered without duplicate data.
- Focused verification: 3 tests / 20 assertions; scoped ESLint and diff-check
  pass. UI audit is blocked before discovery completes by the pre-existing
  shared Employees error `PageSchemaError: actions[4].fields is not allowed`.
- Odoo authenticated desktop/mobile reaches the Personal tab, but Abigail
  Peterson has no bank-account rows. Core3 authentication is blocked by the
  same discovery error. Evidence:
  `evidence/employees/2026-09-21/EMP-BANK-TRUST-001/`.
- Conditional feature evidence only; no aggregate Employees sign-off.

## EMP-BANK-ALLOCATION-001 (2026-09-21)

- Selected the smallest remaining source-backed employee action after bank
  trust: Odoo `action_open_allocation_wizard` / `hr.bank.account.allocation.wizard`.
- Added page/API-separated `/employees/bank-allocations`, employee-detail
  navigation, durable line editing, exact-100% save validation, and a durable
  `employee_bank_allocation_runs` save audit migration.
- Guards cover `employees.read`/`employees.write`, actor identity, active and
  current-company employee scope, parent and line row versions, allocation
  values, percentage overflow, and exact-total save.
- Focused verification: 4 tests / 26 assertions; scoped ESLint and
  `git diff --check` pass. Browser captures show authenticated Core3
  desktop/mobile route and guarded empty state; Odoo authenticated desktop/mobile
  has no reference bank-account rows. Evidence:
  `evidence/employees/2026-09-21/EMP-BANK-ALLOCATION-001/`.
- Conditional feature evidence only; no aggregate Employees sign-off.

## EMP-VISA-WORK-PERMIT-001 (2026-09-21)

- Selected the next uncovered source-backed Employee Personal behavior:
  Odoo's Visa & Work Permit group and its visa/work-permit expiry details.
- Added page/API-separated fields for visa number and expiry, permit number and
  expiry, and durable document presence/filename metadata. Added migration
  `20260921120000-042` with idempotent deterministic fixtures for the supplied
  Employees demo employees.
- Employee create/edit is guarded by `employees.write`, current-company scope,
  row-version concurrency, ISO date validation, and the work-permit document
  metadata invariant. Binary upload is explicitly not claimed by this slice.
- Focused verification: **4 tests / 23 assertions**; full Employees glob green;
  UI audit **692 pages / 701 routes / 1,294 datasources**; scoped ESLint and
  `git diff --check` pass.
- Evidence: `evidence/employees/2026-09-21/EMP-VISA-WORK-PERMIT-001/`.
  Authenticated Core3 desktop/mobile render the labels but are company-blocked
  (`Core3 Demo Company` session vs `Core3 Vietnam` fixtures); authenticated Odoo
  desktop/mobile show Abigail Peterson's source group. Seven Odoo shell icon
  404s are unrelated. Conditional evidence only; no aggregate sign-off.

## EMP-CITIZENSHIP-001 (2026-09-21)

- Selected the next uncovered source-backed Employee Personal behavior: Odoo's
  Citizenship group for nationality, identification, SSN, passport, and
  passport expiry.
- Added page/API-separated fields and migration `20260921130000-043` with
  idempotent deterministic fixtures. `country_id` is a durable country-name
  projection because the sample service has no country catalog relation.
- Employee create/edit is guarded by `employees.write`, current-company scope,
  row-version concurrency, and ISO passport-expiration validation.
- Focused verification: **4 tests / 21 assertions**; full Employees glob green;
  UI audit **692 pages / 701 routes / 1,294 datasources**; scoped ESLint and
  `git diff --check` pass.
- Evidence: `evidence/employees/2026-09-21/EMP-CITIZENSHIP-001/`.
  Authenticated Core3 desktop/mobile render the labels but are company-blocked;
  authenticated Odoo desktop/mobile show Abigail Peterson's source group. Seven
  Odoo shell icon 404s are unrelated. Conditional evidence only; no aggregate
  sign-off.

## EMP-WORK-MOBILE-001 (2026-09-21)

- Selected the next uncovered source-visible Employee behavior: Odoo's
  `hr.employee.mobile_phone` / Work Mobile field.
- Added migration `20260921190000-049`, deterministic mobile fixtures, paired
  page/API fields, and existing employee write/company/optimistic-concurrency
  guards.
- Focused verification: **4 tests / 16 assertions**; scoped ESLint and
  `git diff --check` pass. Core3 browser startup is blocked by concurrent
  Inventory `search.categories` and `search.or locations...` schema errors.
- Evidence: `evidence/employees/2026-09-21/EMP-WORK-MOBILE-001/`; authenticated
  Odoo desktop/mobile pass conditionally with an empty reference value. No
  aggregate Employees sign-off is claimed.

## EMP-LEGAL-NAME-001 (2026-09-21)

- Selected Odoo's editable Personal Information `hr.employee.legal_name` as
  the next uncovered source-backed Employee behavior.
- Added migration `20260921170000-047`, deterministic legal-name fixtures,
  paired page/API fields, create fallback, and existing permission/company/
  optimistic-concurrency guards.
- Focused verification: **4 tests / 18 assertions**; scoped ESLint and
  `git diff --check` pass. The shared UI audit is conditional because
  concurrent Inventory YAML prevents global page discovery.
- Evidence: `evidence/employees/2026-09-21/EMP-LEGAL-NAME-001/`. Odoo desktop/
  mobile pass; Core3 desktop is authenticated but fixture-company blocked, and
  Core3 mobile hits the unrelated Inventory page-schema error. No aggregate
  Employees sign-off is claimed.

## EMP-DOCUMENTS-001 (2026-09-21)

- Selected Odoo's visible Personal → Documents group: `id_card` and
  `driving_license`.
- Added migration `20260921180000-048`, deterministic presence/filename
  fixtures, paired page/API fields, and guarded employee create/edit support.
  Binary attachment transport remains an explicit follow-up boundary.
- Focused verification: **4 tests / 23 assertions**; scoped ESLint and
  `git diff --check` pass. Core3 browser startup is blocked by concurrent
  Inventory `components[2].title is not allowed` discovery failure.
- Evidence: `evidence/employees/2026-09-21/EMP-DOCUMENTS-001/`; authenticated
  Odoo desktop/mobile pass. No aggregate Employees sign-off is claimed.

## EMP-BIRTHDAY-VISIBILITY-001 (2026-09-21)

- Selected the next uncovered source-backed Personal behavior: Odoo's
  `birthday_public_display` / `Show to all employees` control and its safe
  public-directory projection.
- Added page/API-separated employee-detail and directory contracts plus
  migration `20260921160000-046` with idempotent birthday and visibility
  fixtures. Create/edit uses `employees.write`, current-company, and row-version
  guards; hidden birthdays are not projected to the directory.
- Focused verification: **4 tests / 22 assertions**; authenticated Core3 and
  Odoo desktop/mobile captures; scoped ESLint, audit, and diff-check pending
  finalization.
- Evidence: `evidence/employees/2026-09-21/EMP-BIRTHDAY-VISIBILITY-001/`.
  Core3 is company-blocked (`Core3 Demo Company` session versus `Core3
  Vietnam` fixtures); Odoo Abigail Peterson has no birthday, so the source
  checkbox is intentionally hidden. Conditional evidence only; no aggregate
  sign-off.

## EMP-PRIVATE-LOCATION-001 (2026-09-21)

- Selected the next uncovered source-backed Employee Personal behavior: Odoo's
  structured private Location group and home-to-work distance/unit fields.
- Added page/API-separated fields and migration `20260921140000-044` with
  idempotent deterministic fixtures. State and country are durable visible-name
  projections because the sample service has no shared catalog relation.
- Employee create/edit is guarded by `employees.write`, current-company scope,
  row-version concurrency, non-negative distance, and kilometers/miles unit
  validation.
- Focused verification: **4 tests / 23 assertions**; new slice passes; scoped
  ESLint and `git diff --check` pass. Full Employees discovery/audit is blocked
  by the unrelated Inventory schema error recorded below.
- Evidence: `evidence/employees/2026-09-21/EMP-PRIVATE-LOCATION-001/`.
  Authenticated Odoo desktop/mobile show the source group. Core3 cannot start
  until the shared Inventory page removes unsupported `search.lots` and
  `search.or packages...` keys. Conditional evidence only; no sign-off.

## EMP-PRIVATE-CONTACT-001 (2026-09-21)

- Selected the next uncovered source-backed Employee Personal behavior: Odoo's
  Private Contact group, specifically the source-named `private_phone` beside
  `private_email`.
- Added page/API-separated private-contact fields and migration
  `20260921150000-045` with idempotent deterministic fixtures. The existing
  generic `phone` projection remains available outside the Private Contact
  group.
- Employee create/edit is guarded by `employees.write`, current-company scope,
  and row-version concurrency; migration replay and file-backed restart pass.
- Focused verification: **4 tests / 18 assertions**; UI audit **694 pages / 703
  routes / 1,306 datasources**; scoped ESLint and `git diff --check` pass.
- Evidence: `evidence/employees/2026-09-21/EMP-PRIVATE-CONTACT-001/`.
  Authenticated Core3 desktop/mobile render the fields but are company-blocked;
  authenticated Odoo desktop/mobile show Abigail Peterson's source group. Seven
  Odoo shell icon 404s are unrelated. Conditional evidence only; no aggregate
  sign-off.

## EMP-CONTRACT-TYPE-001 (2026-09-21)

- Selected the next uncovered source-backed Payroll behavior: Odoo's
  manager-only `hr.version.contract_type_id` / Contract Type field.
- Added migration `20260921200000-050` with durable employee projection and
  deterministic Permanent/Temporary/Contractor fixtures. A dedicated
  `employees.manage` action updates the employee and current active
  `employee_versions` contract type under actor, active/current-company,
  supported-value, and optimistic-concurrency guards.
- Page/API contracts remain separate and join at `employee-detail`; the
  Payroll Contract Overview is manager-only and the field is read-only in the
  general employee form, with the dedicated manager action providing the CRUD
  write path.
- Focused verification: **4 tests / 20 assertions**; migration replay and
  file-backed restart pass. UI audit **705 pages / 714 routes / 1340
  datasources**, scoped ESLint, and diff-check pass.
- Evidence: `evidence/employees/2026-09-21/EMP-CONTRACT-TYPE-001/`.
  Authenticated Core3 desktop/mobile render Payroll and Contract Type with no
  browser/request errors or overflow, but the `Core3 Vietnam` fixture is
  hidden from the `Core3 Demo Company` session. Odoo desktop/mobile render
  the source label, but Abigail Peterson has no populated value; seven app
  icon 404s are unrelated shell noise. Conditional evidence only; no
  aggregate Employees sign-off.

## EMP-HR-RESPONSIBLE-001 (2026-09-21)

- Selected the next uncovered source-backed Settings behavior: Odoo's
  `hr.version.hr_responsible_id` / Approvers field.
- Added migration `20260921210000-051` with durable employee and current
  employee-version projections plus deterministic HR Manager / People
  Operations fixtures. A dedicated `employees.write` action updates both
  records under actor, active/current-company, supported-value, and
  optimistic-concurrency guards.
- Page/API contracts remain separate and join at `employee-detail`; Settings
  exposes a write-gated Approvers group and the dedicated action is the only
  HR Responsible write path.
- Focused verification: **4 tests / 20 assertions**; migration replay and
  file-backed restart pass. UI audit **706 pages / 715 routes / 1343
  datasources**, scoped ESLint, and diff-check pass.
- Evidence: `evidence/employees/2026-09-21/EMP-HR-RESPONSIBLE-001/`.
  Authenticated Core3 desktop/mobile render Settings / Approvers / HR
  Responsible with no browser/request errors or overflow, but the `Core3
  Vietnam` fixture is hidden from the `Core3 Demo Company` session. Odoo
  desktop/mobile render the source control, but Abigail Peterson has no
  populated approver; seven app-icon 404s are unrelated shell noise.
  Conditional evidence only; no aggregate Employees sign-off.

## EMP-ATTENDANCE-PIN-001 (2026-09-21)

- Selected the next uncovered source-backed Settings behavior: Odoo's
  `hr.employee.pin` / Attendance and Point of Sale `PIN Code` field. This is
  distinct from the completed barcode/badge and work-mobile slices.
- Added migration `20260921220000-052` with replay-safe numeric PIN fixtures;
  employee sample loading and creation preserve deterministic PIN behavior.
  The page-only Settings group joins `employee-detail` API YAML by `page.id`,
  and a dedicated `employees.write` edit action keeps the PIN separate from
  the generic employee editor.
- Guards require actor identity, active employee/current-company scope,
  optimistic row version, and digits-only PIN input; blank input clears the
  optional value. Focused verification: **4 tests / 20 assertions** covering
  source mapping, CRUD, atomic permission/company/concurrency/validation
  failures, migration replay, and file-backed restart.
- Authenticated Core3/Odoo desktop and mobile evidence is under
  `evidence/employees/2026-09-21/EMP-ATTENDANCE-PIN-001/`. Any fixture-company,
  reference-data, shell-noise, or runtime limitations are recorded there;
  feature evidence is conditional and does not represent aggregate sign-off.

## EMP-COACH-001 (2026-09-21)

- Selected the next uncovered source-backed employee behavior: Odoo's
  `hr.employee.coach_id` search/list projection and current-company relation.
- Added migration `20260921230000-053` with idempotent `coach_name` storage and
  deterministic coach fixtures. Employees list search/filter/column projection
  and employee Work display are page contracts; list/detail datasources and
  the dedicated guarded Edit Coach action are API/action contracts.
- Guards require `employees.write`, actor identity, active/current-company
  employee and coach scope, supported active coach, and optimistic row version.
  Invalid, stale, actor-missing, and cross-company writes remain atomic.
- Focused verification: `test/employees_coach.integration.test.ts`, **4 tests
  / 23 assertions**; UI audit passed at **712 pages / 721 routes / 1,359
  datasources**; scoped ESLint and `git diff --check` pass.
- Authenticated Core3/Odoo desktop/mobile evidence is under
  `evidence/employees/2026-09-21/EMP-COACH-001/`. Core3's fixture-company
  mismatch and Odoo's default-hidden optional Coach column are recorded there;
  no aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-PROPERTIES-001 (2026-09-21)

- Selected the next uncovered visible HR-user employee behavior: Odoo's
  dynamic `hr.employee.employee_properties` form field and Properties search
  grouping. Employee Tags were deliberately excluded because Odoo keeps that
  menu behind `base.group_no_one` in the current source.
- Added migration `20260922000000-054` with durable `employee_properties` JSON
  text and deterministic object fixtures. The employee detail page group is
  read-gated; the paired API/action contract exposes guarded Edit Properties
  and create/edit persistence.
- Guards require `employees.write`, actor identity, active/current-company
  scope, optimistic row version, and object-shaped input. Blank values
  normalize to `{}`; invalid, stale, actor-missing, and cross-company writes
  remain atomic.
- Focused verification: `test/employees_properties.integration.test.ts`, **4
  tests / 19 assertions**, plus coach regression **8 / 42**; UI audit passed at
  **714 pages / 723 routes / 1,364 datasources**; scoped ESLint and diff-check
  pass.
- Evidence is under
  `evidence/employees/2026-09-21/EMP-EMPLOYEE-PROPERTIES-001/`. Odoo detail
  captures are authenticated desktop/mobile but the reference company has no
  dynamic Properties definition; Core3 backend startup was unavailable. No
  aggregate Employees sign-off is claimed.

## EMP-PAY-CATEGORY-001 (2026-09-21)

- Selected Odoo's manager-only `hr.version.structure_type_id` Payroll field,
  rendered as Pay Category, as the next uncovered user-visible behavior.
- Added migration `20260922020000-056` with durable employee and current-record
  `pay_category_name` values and deterministic fixtures. The manager-gated
  Payroll projection and dedicated API/action contract remain separate YAML
  layers joined at `employee-detail`.
- Guards require `employees.manage`, actor identity, active/current-company
  scope, an active current Payroll record, supported values, and optimistic
  row-version concurrency. Focused verification is **4 tests / 21 assertions**
  with replay and restart coverage.
- Evidence is under
  `evidence/employees/2026-09-21/EMP-PAY-CATEGORY-001/`. Authenticated Odoo
  desktop/mobile captures completed; mobile showed Pay Category, while Core3
  backend port 3001 did not bind during the bounded memory-mode attempt. No
  aggregate Employees sign-off is claimed.

## EMP-PRIVATE-CAR-PLATE-001 (2026-09-21)

- Selected Odoo's HR-user `hr.employee.private_car_plate` search field as the
  next uncovered visible Employees behavior; it is distinct from the excluded
  private contact/location and completed lifecycle slices.
- Added migration `20260922010000-055`, deterministic plate fixtures, list
  projection/search, and create/edit API fields. Page YAML and API YAML remain
  separate and join at `employees`.
- Focused verification: `test/employees_private_car_plate.integration.test.ts`,
  **4 tests / 21 assertions**, covering source mapping, CRUD/list/read,
  stale/company guards, replay, and restart. Audit, scoped lint, and diff-check
  are recorded with the commit.
- Evidence is under
  `evidence/employees/2026-09-21/EMP-PRIVATE-CAR-PLATE-001/`. Authenticated Odoo
  desktop/mobile captures succeeded; the optional field is hidden by default.
  Core3 backend port 3001 did not bind during the bounded memory-mode attempt.
  No aggregate Employees sign-off is claimed.

## EMP-WORK-LOCATION-ASSIGNMENT-001 (2026-09-21)

- Selected the next uncovered source-visible employee behavior: Odoo's
  `hr.version.work_location_id`, rendered in the Work tab's Location group.
  This is distinct from the completed standalone Work Locations catalog.
- Added migration `20260922040000-058` with durable `work_location_id`
  columns on employees and employee versions, deterministic relation backfill,
  and stable display-name fixtures.
- Added the paired employee-detail API options datasource and guarded
  `edit_employee_work_location` action. The page keeps Work Location in the
  existing Work/Location group and adds the action binding; the API updates
  both employee and active Payroll version.
- Guards require `employees.write`, actor identity, active/current-company
  employee, active location matching the employee address, active Payroll
  version, and stale row-version protection. Focused verification is **4 tests
  / 20 assertions**.
- Authenticated Odoo desktop/mobile evidence is under
  `evidence/employees/2026-09-21/EMP-WORK-LOCATION-ASSIGNMENT-001/`; both show
  the Work Location control. Core3 backend port 3001 did not bind during the
  bounded memory-mode attempt; the exact blocker is in `verification.md`.
  No aggregate Employees sign-off is claimed.

## EMP-WORKING-HOURS-001 (2026-09-21)

- Selected the next uncovered source-visible employee behavior: Odoo's
  employee-specific `resource_calendar_id`, rendered as Working Hours in the
  Payroll form. This is distinct from the completed working-schedule catalog
  CRUD and from excluded Pay Category/private-car slices.
- Added migration `20260922030000-057` with durable `working_schedule_id`
  columns on employees and employee versions, deterministic backfill from
  existing schedule names, and synchronized legacy display values.
- Added a page-only Payroll Working Hours group and matching API datasource,
  options catalog, and manager-gated Edit Working Hours action. The action
  updates the employee and active Payroll record with actor, active/current
  company, eligible schedule, active version, and stale row-version guards.
- Focused verification is **4 tests / 20 assertions**; audit is **718 pages /
  727 routes / 1,379 datasources**. Scoped lint and diff-check are recorded
  with the commit.
- Authenticated Odoo desktop/mobile evidence is under
  `evidence/employees/2026-09-21/EMP-WORKING-HOURS-001/`. Both show the Working
  Hours label in Payroll. Core3 backend port 3001 did not bind during the
  bounded memory-mode attempt; the exact blocker is in `verification.md`.
  No aggregate Employees sign-off is claimed.
