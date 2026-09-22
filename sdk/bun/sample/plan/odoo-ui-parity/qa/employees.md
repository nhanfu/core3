# employees QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/employees-desktop.png and employees-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable employees assignment (pending wave dispatch)
Module owner: employees module owner
Verification trigger: feature-complete
Candidate commit: current working tree

## EMP-EMPLOYEE-AVATAR-001 execution (2026-09-21)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-015 | Employee avatar upload/remove and authenticated image projection | pass; 4 focused tests / 25 assertions |
| EMP-PERM-015 | Actor, active/current-company, MIME/size, and stale row-version guards | pass; rejected writes were atomic |
| EMP-DATA-015 | Deterministic inline fixture, migration replay, and file-backed restart | pass |
| EMP-UI-011 | Authenticated Core3/Odoo desktop/mobile avatar comparison | conditional; Core3 company/fixture mismatch and rejected Odoo credential are recorded blockers |

Evidence: `evidence/employees/2026-09-21/EMP-EMPLOYEE-AVATAR-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-NEWLY-HIRED-FILTER-001 execution (2026-09-22)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-059 | Odoo `newly_hired` computed/search field and Employees search view | pass; local Odoo 19 source and authenticated live Employees filter both expose `Newly Hired` |
| EMP-DATA-059 | Deterministic projection and migration replay | pass; known demo creation timestamps and the `newly_hired` projection survive replay and file-backed restart |
| EMP-PERM-059 | Employees read/company boundary | pass; datasource declares `employees.read`, foreign company returns an empty result, and no mutation path is introduced |
| EMP-UI-055 | Authenticated Odoo/Core3 desktop and mobile | conditional; Odoo filtered desktop/mobile captures pass; Core3 renders the authenticated empty state because the QA session is in `Core3 Demo Company` while the fixture is `Core3 Vietnam` |

Focused test: `test/employees_newly_hired.integration.test.ts` (**4 tests /
15 assertions**). Evidence:
`evidence/employees/2026-09-22/EMP-EMPLOYEE-NEWLY-HIRED-FILTER-001/`.
Unrelated module changes remain unstaged. No aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-MY-TEAM-DEPARTMENT-FILTER-001 execution (2026-09-22)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-064 | Odoo `my_team`, `my_department`, and `member_of_department` source mapping | pass; local Odoo 19 XML/Python source and paired page/API bindings are asserted |
| EMP-DATA-064 | Durable scope index and deterministic query projection | pass; migration is idempotent and the derived booleans survive file-backed restart |
| EMP-PERM-064 | Authenticated employee/company boundary | pass; same-company current-user scope is enforced and an actor without an employee returns no rows |
| EMP-UI-064 | Authenticated Odoo/Core3 desktop and mobile | blocked; the authenticated Odoo tab was already borrowed by bsk session `ojpy`, so no screenshot or visual-parity claim is made |

Focused test: `test/employees_team_department_filters.integration.test.ts`
(3 tests / 19 assertions). Evidence:
`evidence/employees/2026-09-22/EMP-EMPLOYEE-MY-TEAM-DEPARTMENT-FILTER-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-HR-PRESENCE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-061 | Odoo `hr_presence_state`/`hr_icon_display` model and list/form view to paired contracts | pass; source selections, list Presence field, form widget, and `page.id` bindings are asserted |
| EMP-WF-061 | Durable HR Presence read and refresh workflow | pass; deterministic state projects and refresh derives the state from current employee presence while incrementing row version |
| EMP-PERM-061 | `employees.write`, actor, current company, missing employee, and stale row version | pass; invalid requests reject atomically |
| EMP-DATA-061 | Migration replay and file-backed restart | pass; state fixtures and refreshed values survive reopen without duplicate effects |
| EMP-UI-061 | Authenticated Core3/Odoo desktop/mobile comparison | conditional; Core3 1440x1000 and 390x844 sessions had zero failed requests but the fixture was hidden by the Demo Company context; Odoo rejected `admin/admin` and rate-limited the mobile retry |

Focused test: `test/employees_hr_presence.integration.test.ts` (4 tests,
26 assertions). Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-HR-PRESENCE-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-WORK-LOCATION-TYPE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-062 | Odoo `work_location_type` and `hr.work.location.location_type` source mapping | pass; Home/Office/Other projection is present in paired detail contracts |
| EMP-WF-062 | Work Location Type refresh and assignment synchronization | pass; durable type refresh increments employee row version and assignment updates the projection |
| EMP-PERM-062 | Actor, current company, missing employee, and stale row-version guards | pass; invalid requests reject atomically |
| EMP-DATA-062 | Migration replay and file-backed restart | pass; seeded and refreshed values survive replay/reopen without duplicate migration effects |
| EMP-UI-062 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 renders the field with 200 API responses but hides the Vietnam fixture under Demo Company; Odoo `admin/admin` login is rejected |

Focused test: `test/employees_work_location_type.integration.test.ts` (4
tests, 20 assertions), with Work Location/Address regressions (12 tests, 62
assertions). Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-WORK-LOCATION-TYPE-001/`. No
aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-WORK-CONTACT-SYNC-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-063 | Odoo `_inverse_work_contact_details` source and Work Email/Phone form controls | pass; source and paired API/page bindings are asserted |
| EMP-WF-063 | Existing linked contact email/phone synchronization | pass; employee projection, contact row, audit event, and row versions update durably |
| EMP-PERM-063 | Actor, current company, missing contact, employee stale, and contact stale guards | pass; invalid requests reject atomically |
| EMP-DATA-063 | Migration replay and file-backed restart | pass; synchronized contact details and one audit event survive reopen |
| EMP-UI-063 | Authenticated Odoo/Core3 desktop and mobile | conditional; Odoo captures pass through `bsk`; Core3 is blocked by shared `actions[7].fields must be a non-empty array` discovery failure |

Focused test: `test/employees_work_contact_sync.integration.test.ts` (4
tests, 24 assertions). Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-WORK-CONTACT-SYNC-001/`. No
aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-RELATED-USER-ACTIVE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-060 | Odoo `is_user_active` related field to paired page/API contracts | pass; local durable related-user projection, detail read, status action, and Settings field use `page.id: employee-detail` |
| EMP-WF-060 | Activate/deactivate related-user status | pass; status and employee row version persist durably |
| EMP-PERM-060 | `auth.users.manage`, actor, current company, missing projection, and stale guards | pass; invalid requests reject atomically |
| EMP-DATA-060 | Migration replay and file-backed restart | pass; deterministic status survives restart without duplicate effects |
| EMP-UI-056 | Authenticated Core3 desktop/mobile and Odoo comparison | conditional; Core3 1440x1000 and 390x844 captures have zero failed requests; Odoo rejected `admin/admin` and rate-limited the mobile retry |

Focused test: `test/employees_related_user_active.integration.test.ts`
(4 tests, 21 assertions). Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-RELATED-USER-ACTIVE-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-WORK-PERMIT-ACTIVITY-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-059 | Odoo `work_permit_scheduled_activity` model field to paired page/API contracts | pass; detail read, generic CRUD, dedicated action, and Visa & Work Permit page field use `page.id: employee-detail` |
| EMP-WF-059 | Create/edit scheduled activity preference | pass; boolean value and employee row version persist durably |
| EMP-PERM-059 | `employees.write`, actor, current company, missing, and stale guards | pass; invalid requests reject atomically without changing the preference |
| EMP-DATA-059 | Migration replay and file-backed restart | pass; deterministic preferences survive restart without duplicate effects |
| EMP-UI-055 | Authenticated Core3 desktop/mobile and Odoo comparison | conditional; Core3 1440x1000 and 390x844 captures have zero failed requests; Odoo rejected `admin/admin` and rate-limited the mobile retry |

Focused test: `test/employees_work_permit_activity.integration.test.ts`
(4 tests, 20 assertions). Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-WORK-PERMIT-ACTIVITY-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-RELATED-CONTACTS-001 execution (2026-09-21)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-017 | Related Contacts count/stat, contact read/navigation, and work-contact set/clear | pass; 4 focused tests / 23 assertions |
| EMP-PERM-017 | Actor, `employees.read`/`employees.write`, active/current-company, person/company eligibility, and stale row-version guards | pass; rejected writes were atomic |
| EMP-DATA-017 | Deterministic contact fixture, migration replay, and file-backed restart | pass |
| EMP-UI-013 | Authenticated Core3/Odoo desktop/mobile comparison | conditional; Core3 blocked by unrelated Surveys page discovery and Odoo credential rejected |

Evidence: `evidence/employees/2026-09-21/EMP-EMPLOYEE-RELATED-CONTACTS-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-LANGUAGE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-059 | Odoo `hr.employee.lang` to paired page/API contracts | pass; model/profile source mapping, detail projection, catalog datasource, and `page.id: employee-detail` binding are covered |
| EMP-WF-059 | Create/edit employee Language | pass; supported language values persist and increment employee row version |
| EMP-PERM-059 | `employees.write`, actor, company, missing, stale, and catalog validation | pass; invalid requests reject atomically without changing Language or row version |
| EMP-DATA-059 | Migration replay and file-backed restart | pass; language catalog and employee preference survive restart without duplicate rows |
| EMP-UI-055 | Authenticated Core3 desktop/mobile and Odoo comparison | conditional; Core3 renders Language with zero failed requests but fixture values are hidden by the Demo Company context; Odoo credentials were rejected and then rate-limited |

Focused test: `test/employees_language.integration.test.ts` (4 tests, 23
assertions). Adjacent regression run: 12 tests, 62 assertions. Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-LANGUAGE-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-ATTACHMENTS-001 execution (2026-09-21)

| Case | Scope | Result |
| --- | --- | --- |
| EMP-WF-016 | Employee attachment upload, read/download projection, and remove | pass; 4 focused tests / 26 assertions |
| EMP-PERM-016 | Actor, `employees.read`/`employees.write`, active/current-company, duplicate, and stale parent/line guards | pass; rejected writes were atomic |
| EMP-DATA-016 | Deterministic handbook fixture, migration replay, and file-backed restart | pass |
| EMP-UI-012 | Authenticated Core3/Odoo desktop/mobile attachment comparison | conditional; Core3 company/fixture mismatch and rejected Odoo credential are recorded blockers |

Evidence: `evidence/employees/2026-09-21/EMP-EMPLOYEE-ATTACHMENTS-001/`.
No aggregate Employees sign-off is claimed.

## EMP-LAUNCH-PLAN-001 evidence ledger (2026-09-20)

| Surface | Result | Evidence |
| --- | --- | --- |
| YAML/API separation and source mapping | pass | `employees_launch_plan.integration.test.ts` |
| Durable expansion, restart, stale/company/actor guards | pass | focused 4 tests / 33 assertions; full Employees 71 / 791 |
| Core3 authenticated desktop/mobile detail and modal | pass with fixture blocker | `evidence/employees/2026-09-20/EMP-LAUNCH-PLAN-001/core3-*.png` |
| Odoo authenticated desktop employee/detail/modal | pass | `evidence/employees/2026-09-20/EMP-LAUNCH-PLAN-001/odoo-desktop-*.png` |
| Odoo authenticated mobile employee/detail | pass; action hidden at narrow viewport | `evidence/employees/2026-09-20/EMP-LAUNCH-PLAN-001/odoo-mobile-employee.png` |

The Core3 browser selector is empty under the authenticated `Core3 Vietnam
Branch` context because the supplied employee fixtures use `Core3 Vietnam`.
This is recorded as a precise evidence blocker, not a sign-off claim.

## EMP-ROUTE-CRUD-GATE-001 evidence ledger (2026-09-20)

| Gate | Result | Evidence |
| --- | --- | --- |
| Parameterized Core3 route matrix | pass: 28/28 desktop and 28/28 mobile after settled-route retry | `core3-route-matrix.json` |
| Authenticated employee CRUD | pass: create, edit, archive, restore; no browser errors | `core3-desktop-crud-*.png` |
| Actor matrix | pass: Admin allowed; Fleet 403; unauthenticated login redirect | `core3-actor-matrix.json` |
| Core3 responsive comparison | pass: employee list/detail at desktop and mobile | `core3-*-employees-list.png`, `core3-*-employee-detail.png` |
| Paired Odoo comparison | pass: authenticated Employees list/detail at desktop and mobile | `odoo-comparison.json`, `odoo-*-employees-*.png`, `odoo-*-employee-detail.png` |

The shared checkout itself was not used for this browser run because another
owner's uncommitted Timesheets YAML failed global page discovery. The clean
runtime was the exact committed Employees HEAD; no other module was edited or
staged. This gate has evidence but does not change aggregate full-module
sign-off status.

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Employee action-mode and training-attendance contracts pass in focused
  reruns after menu inventory assertions were reconciled.
- Focused Employees suite: `bun test ./test/employees*.integration.test.ts --timeout 20000` — 52 passed, 0 failed, 634 assertions across 16 files.
- DEV-4 employee CRUD slice: deterministic create/edit/archive/restore passed
  with duplicate employee-number, required-value, missing-record, and
  stale-write guards; row versions advanced 1 → 4 and action mutations use
  explicit generated IDs and active-state guards.
- Company-scope slice: primary employee list/detail and lifecycle mutations accept
  `current_company_name`; wrong-company reads and writes are blocked, while same-
  company create/edit/archive/restore persists company identity and row versions.
- Authenticated module-scoped route smoke covered 27 registered routes at desktop and mobile. 47/54 bare-route checks were clean; six affected detail/list states were isolated with valid seeded IDs and passed at mobile with no browser or request errors. Bare detail routes without an `id` are not treated as valid record-state acceptance inputs.
- Fleet user permission boundary: `/employees/settings` returned HTTP 403 with `Requires permission: employees.settings`, with no browser errors.
- Current dependency-free module runner on port 4037 passed all 28 manifest
  routes at desktop/mobile: 56/56 with no page errors, failed requests, HTTP
  errors, blank states, or horizontal overflow.
- Authenticated mobile employee detail workflow after the archive-action fix:
  Archive returned 200 and changed the visible action to Restore after reload;
  Restore returned 200 and returned the visible action to Archive.
- The detailed per-module checklist is approved at
  `qa/test-plans/employees.md`.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EMPLOYEES-FUNC-001 | Focused functionality, catalog CRUD, settings, records, and Work-tab contracts | 52 tests, 634 assertions; focused suite passed | pass |
| EMPLOYEES-BROWSER-001 | Authenticated module route and seeded detail-state smoke | 28 routes × desktop/mobile = 56/56 with valid seeded detail states | pass |
| EMPLOYEES-PERM-001 | Non-manager cannot open Employees settings | Fleet user received HTTP 403 with `Requires permission: employees.settings`; browser errors 0 | pass |
| EMPLOYEES-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Focused suite, corrected archive/restore workflow, complete route matrix, and permission boundary are recorded; paired Odoo and broader actor/CRUD coverage remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EMPLOYEES-BROWSER-001 | Initial bare-route smoke used missing IDs for some record detail routes and produced empty states; several mobile checks also observed late lazy-asset requests while changing routes | — | Corrected matrix with seeded IDs passed 56/56 | fixed |
| EMPLOYEES-FUNC-001 | Archive action submitted the entire form state, so `defaults.active=false` was overwritten by `active=true`; API returned 200 without archiving | current change | Explicit action params and concurrency guard; browser Archive/Restore retest passed after restart | fixed |
| EMPLOYEES-FUNC-002 | Primary employee create mutation relied on database-generated UUIDs and had no declarative duplicate/required guards; archive/restore accepted invalid lifecycle state | DEV-4 working tree | Deterministic employee-number ID, required/duplicate guards, edit not-found/name guard, and active-state archive/restore guards; focused CRUD test passed | fixed |

## Sign-off

- Functional: pass for tested contracts and employee CRUD/archive/restore slice
- Permissions: partial; settings denial and contract boundaries pass, broader actor matrix remains
- Persistence/data integrity: partial pass; archive/restore survives reload, restart and full CRUD evidence remain
- Desktop/mobile visual parity: route smoke pass; paired Odoo comparison pending
- Tester decision: conditional; paired Odoo, actor, and broader CRUD gates remain open

## Bounded QA run for candidate 99b87bd8 (2026-09-13)

- Candidate: `99b87bd84436a7bb162f9c7b873ccdc8ad0e6c15`, clean developer
  worktree `agent/odoo-employees-wave-dev4`.
- Focused command from `sdk/bun/sample`: `bun test
  ./test/employees*.integration.test.ts --timeout 20000` — 52 passed, 1
  failed, 640 assertions across 16 files. Failure:
  `employees_directory.integration.test.ts:38`; archived directory expected
  only `Le Thu Ha` but returned `Le Thu Ha` and `Other Company Employee`.
  This is a reproducible cross-company public-directory fixture/query leak.
- Primary employee company-scope test passed list/detail isolation,
  same-company create/edit/archive/restore persistence, wrong-company create
  denial (`403 EMPLOYEES_COMPANY_SCOPE_REQUIRED`), and wrong-company edit and
  archive denial (`404 EMPLOYEES_RECORD_NOT_FOUND`). Wrong-company restore was
  not exercised and remains unverified. Row versions advanced `1 -> 4`;
  stale edit (`409 STALE_RECORD`), duplicate, required-value, and missing
  guards passed.
- Full command `bun test ./test --timeout 20000` was started and intentionally
  interrupted with SIGINT at the user's request before completion. It has no
  valid pass/fail result and is not claimed as a regression pass.
- `bun run scripts/audit-order-ui.ts` passed: 659 pages, 669 routes, 1,134
  datasources. ESLint on `test/employees*.integration.test.ts` passed;
  `services/employees` is ignored by the repository ESLint configuration.
  `git diff --check HEAD` passed.
- No new authenticated browser/Odoo run completed for this candidate. Existing
  out-of-band captures are `/tmp/core3-odoo-parity/module-matrix-20260912/employees-desktop.png`,
  `employees-mobile.png`, and prior Odoo reference
  `/tmp/core3-odoo-parity/employees-visual4-20260912/odoo-8069-employees-desktop.png`;
  they are not fresh paired evidence for `99b87bd8`. Candidate-specific
  authenticated desktop/mobile CRUD and paired Odoo mobile/detail evidence
  remain open.

QA state: conditional. Blocking findings are the archived directory
cross-company leak, unverified cross-company restore denial, incomplete full
regression, and absent fresh paired browser/Odoo evidence.

## Repair for QA finding 237a2c8b (2026-09-13)

- Root cause: `api/directory.yaml` applied the optional `company_name` filter
  but did not apply the actor `current_company_name` scope; `api/directory-detail.yaml`
  had no company predicate. Archived Directory therefore exposed
  `Other Company Employee` to the Core3 Vietnam actor.
- Fix: both Directory datasource queries now enforce the actor company for
  active, archived, filtered, and detail reads. The company-scope regression
  covers Core3 versus Other Company archived results, cross-company detail
  denial, and wrong-company restore denial (`404 EMPLOYEES_RECORD_NOT_FOUND`).
- The remaining conditional blockers above are unchanged; no aggregate progress
  status is changed by this repair.

## Bounded QA retest for candidate 6a4da038 (2026-09-13)

- Candidate: `6a4da03859dc8124618d080f935543c9620da4ab`, clean linked worktree
  `/home/nhanjs/projects/core3-worktrees/odoo-employees-wave-dev4`. The path
  supplied for this retest included an extra `/agent/` segment and does not
  exist; the linked worktree above is the exact branch/HEAD found by
  `git worktree list`.
- Focused command: `bun test ./test/employees*.integration.test.ts --timeout
  20000` from `sdk/bun/sample` — **53 passed, 0 failed, 647 expect() calls
  across 16 files** in 45.70s.
- Candidate-specific evidence passed: active Directory scoped to Core3
  Vietnam; archived Directory scoped to Core3 Vietnam; archived Directory
  filtered to Other Company; cross-company Directory detail returned no row;
  wrong-company restore returned `404 EMPLOYEES_RECORD_NOT_FOUND` and left
  persistence unchanged; same-company restore persisted active=true at row
  version 4. The prior archived cross-company leak did not reproduce.
- Full `bun test ./test --timeout 20000` was started but stopped with SIGINT
  (exit 130) at finalization after passing tests through the repository stream.
  It has no valid full-suite pass/fail result and is not claimed as a full
  regression pass.
- `bun run scripts/audit-order-ui.ts` passed: 659 pages, 669 routes, 1,134
  datasources. `bunx eslint test/employees*.integration.test.ts` passed.
  `git diff --check HEAD` passed on the final ledger diff before commit.
- No fresh authenticated desktop/mobile browser or paired Odoo capture was
  available in this bounded retest. Existing non-candidate artifacts remain
  `/tmp/core3-odoo-parity/module-matrix-20260912/employees-desktop.png`,
  `employees-mobile.png`, and
  `/tmp/core3-odoo-parity/employees-visual4-20260912/odoo-8069-employees-desktop.png`;
  they are not candidate-specific evidence.

QA state: conditional. Directory company scoping and wrong-company restore
denial are retested pass. Full regression and fresh authenticated desktop,
mobile, and paired Odoo evidence remain blockers; no sign-off is granted.

## Employees departure-reasons company/Odoo follow-up (2026-09-13)

- Scope: departure-reasons only. Existing lifecycle, duplicate-ID, and
  `click_to_edit: false` navigation fixes were preserved.
- Self-contained implementation added in the working tree:
  migration `20260913130000-025-departure-reason-company-scope.yaml` adds and
  backfills `company_name`; list/detail reads and edit/archive/restore/delete
  guards accept `current_company_name`; create enforces the selected company.
- Functional verification: `bun test ./test/employees.integration.test.ts
  --timeout 20000` passed **13 tests / 175 assertions**. Departure acceptance
  plus the action-mode suite passed **16 tests / 235 assertions**. Full module
  command `bun test ./test/employees*.integration.test.ts --timeout 20000`
  passed **57 tests / 684 assertions** across 17 files.
- Static verification: `bun run scripts/audit-order-ui.ts` passed (**661
  pages, 670 routes, 1,154 datasources**); `bunx eslint
  test/employees*.integration.test.ts` passed; `git diff --check` passed.
- Core3 browser/API probe used `admin@tms.local` / `admin123` against the live
  runtime (backend `3001`, frontend `3002`, mediator `3010`). Login exposed
  both companies: `company-demo` / `Core3 Demo Company` and `company-vietnam` /
  `Core3 Vietnam Branch`. Before switching, the departure page returned the
  three Demo Company rows. `POST /api/v1/company/switch` to `company-vietnam`
  returned **HTTP 200** with the Vietnam Branch company, but the same bearer
  token then returned the same three Demo Company rows from
  `/api/pages/employee-departure-reasons?lc=en`. This is an existing auth
  company-context refresh blocker, so authenticated company-switch isolation
  is **blocked**, not passed.
- Odoo runtime: `http://127.0.0.1:8069` is reachable and redirects the
  Employees route to `/web/login` (**303**, login page **200**). The available
  attempted credential `admin/admin` was rejected (**HTTP 400**); no valid
  authenticated local Odoo credential was available, so an authenticated
  Departure Reasons comparison is **blocked**. No Odoo claim is made.
- No screenshot was captured for this follow-up because the required
  authenticated company-switch and paired Odoo states were not available.

Follow-up verdict: **CONDITIONAL FAIL — functional company predicates and
tests pass, but authenticated company-switch isolation and paired authenticated
Odoo comparison remain blocked by the existing auth token refresh and missing
Odoo credentials.**

## 2026-09-13 coordinator review: candidate `c8f461f4`

- Integrated the bounded employee-history relation/API/page binding as
  `a8ebe1b8`. The candidate diff is limited to five Employees-owned files;
  its earlier company-scope prerequisite lineage was not imported.
- History-specific post-merge tests passed: **2 tests, 24 assertions**.
  Candidate evidence remains **54 tests, 652 assertions**, with audit, test
  ESLint, Employees Sass, diff-check, authenticated Core3 desktop/mobile, and
  authenticated Odoo list evidence recorded as passing.
- A broader active-branch probe exposed two baseline company-scope failures:
  11 tests / 157 assertions yielded 2 failures because prerequisite migration
  `99b87bd8` is not on the active branch. That broader prerequisite was not
  folded into this bounded review and requires separate owner coordination.
- Employees remains **conditional / unsigned-off**. Full regression/full lint,
  actor matrix, restart durability, and Odoo detail/history comparison remain
  open; no aggregate progress or module sign-off is claimed.

## 2026-09-13 coordinator review: repair candidate `3de4903f`

- **Not integrated.** The exact candidate contains only
  `employees_company_scope_prerequisite.integration.test.ts`; it assumes
  ancestor implementation `99b87bd8` and directory repair `6a4da038`, neither
  of which is present on the active branch.
- Applying the exact commit alone would fail because migration
  `20260913100000-023-company-scope.yaml` is absent. The active branch already
  showed the corresponding two company-scope baseline failures during the
  prior bounded history review.
- Concrete repair required from the same owner: provide a self-contained
  candidate, or an explicitly approved dependency handoff, including the
  validated `99b87bd8` company-scope implementation and `6a4da038` directory
  predicates before merging this regression guard. Preserve browser/Odoo,
  full-regression, broader actor, and restart blockers; no sign-off is issued.

## 2026-09-13 coordinator reconciliation: candidate `279f8f4d`

- Owner lineage proof reconciled successfully: Git reports the direct lineage
  `279f8f4d -> c401c961`, and the candidate patch itself contains the complete
  11-file Employees migration/API/history/company-scope/test bundle. The prior
  ancestry concern was about the candidate branch history and is superseded
  by this verified patch/lineage evidence.
- Integrated the complete ordered candidate as `4dd70736`. Cherry-pick had
  one expected conflict in the existing Directory test because active history
  already carried the Core3-only assertion; resolution retained the candidate
  `Other Company Employee` fixture expectation. No unrelated files were
  imported.
- Post-merge Employees suite passed: **55 tests, 657 assertions**. Audit
  (**661 pages, 670 routes, 1154 datasources**), Employees test ESLint, Sass,
  and diff-check passed. Candidate Core3 desktop/mobile smoke remains
  accepted; Odoo authentication remains blocked.
- Employees remains **conditional / unsigned-off**. Full regression/full lint,
  broader actor coverage, restart durability, and authenticated Odoo detail/
  history comparison remain open. No aggregate progress or module sign-off is
  claimed.

## 2026-09-13 coordinator review: candidate `279f8f4d`

- **Not integrated.** The candidate’s bounded API/migration/history/company-
  scope patch and 55-test/657-assertion evidence pass, but its ancestry still
  includes `99b87bd8`, `6a4da038`, and `3de4903f`; it is not independently
  self-contained for this active branch.
- Same-owner repair required: provide a genuinely self-contained candidate
  lineage or obtain explicit approval for the complete three-commit dependency
  bundle before review/merge. Do not cherry-pick `279f8f4d` alone.
- Preserve the conditional blockers: unauthenticated Odoo, full regression,
  broader actor matrix, and restart persistence. No module sign-off or
  aggregate progress claim is made.
## 2026-09-13 coordinator dispatch — bounded activity-plan wave

- Existing owner `agent/odoo-employees-wave-dev4-self-contained` is assigned
  on `/home/nhanjs/projects/core3-worktrees/odoo-employees-wave-dev4`, based at
  `279f8f4d`. Development event: `DEV-EMPLOYEES-WAVE-20260913-R2`; QA event:
  `QA-EMPLOYEES-WAVE-20260913-R2`; handoff commits: `7baa8739` and corrected
  owner-handle commit `75a003c4`.
- Scope is one activity-plan launch/onboarding/offboarding workflow slice with
  ordered responsible steps, action/detail contracts, duplicate/inactive/
  missing/permission/company/stale guards, and focused atomicity tests.
  Candidate pending; existing ledgers, unrelated edits, and aggregate
  progress are preserved.
## DEV/QA reconciliation — `DEV-EMPLOYEES-WAVE-20260913-R2` / `QA-EMPLOYEES-WAVE-20260913-R2`

- The owner handoff `75a003c4` requested activity-plan workflow work, but
  authoritative main already contains the bounded configuration slice through
  `6130f0ea`/`8374c42d`, including migration `20260912090000-016` and related
  APIs/pages. No duplicate owner patch is required.
- QA event triggered/reconciled against the existing implementation. Active
  checkout command `bun test test/employees_activity_plans.integration.test.ts`
  passed **3 tests / 39 assertions**, covering page/API binding, seeded plans,
  CRUD, validation, duplicate, stale, archive/restore, and missing-record
  guards.
- Disposition: **bounded QA pass; conditionally accepted for activity-plan
  configuration**. The launch/onboarding/offboarding execution workflow itself
  remains unverified/missing; ordered-step execution, responsible-role runtime
  transitions, actor/browser execution, restart behavior, and paired Odoo
  comparison remain open. No full Employees sign-off is implied.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-EMPLOYEES-DEPARTURE-WAVE-20260913-R2` → `QA-EMPLOYEES-DEPARTURE-WAVE-20260913-R2` | existing `agent/odoo-ui-employees-departure-reasons-20260910` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-employees-departure-reasons-20260910` | Departure-reasons page/API CRUD, validation, archive/restore, company/role scope, stale/missing guards, and focused atomicity tests | dispatched in `860ca120`; awaiting self-contained product commit before QA |

Lifecycle decision: **stalled** after repeated unchanged polls and escalation
`a722470c`; handoff status recorded in `7ebb3f68`. Partial product files remain
preserved; QA was not triggered.

## Coordinator reconciliation: departure-reasons repair `382a3d30` (2026-09-13)

- Ownership and scope are valid. The active branch already contains the exact
  six-file same-module repair `382a3d30`; it adds departure-reason Archive and
  Restore actions/page bindings, exposes active/status in list and detail
  sources, and maps `expected_row_version` to the row-version concurrency
  guard. No duplicate cherry-pick was created.
- Active verification passed: Employees focused lifecycle suite **12 tests /
  167 assertions**; UI audit **661 pages / 670 routes / 1,154 datasources**;
  candidate ESLint and diff-check evidence passed.
- Bounded disposition: **conditionally reconciled as already integrated**.
  Fresh authenticated browser, broader actor/restart coverage, and paired Odoo
  comparison remain open. Prior departure stalled-owner history and partial
  file findings are preserved; this does not sign off Employees.

## Final active-runtime browser event: Departure Reasons `382a3d30` (2026-09-13)

- Active runtime checkout `f7ef34e4` contains `382a3d30` and Events
  `ab5496ba`; backend `127.0.0.1:3001` and frontend `localhost:3002` returned
  HTTP 200, with mediator 3010 listening.
- Admin desktop `1440x900`: New plus a unique departure reason and Save
  returned HTTP 200; the new row rendered with zero console errors. Selecting
  the row entered list inline-edit mode (`Save`/`Discard`) rather than opening
  the detail route. Detail Edit/Archive/Restore, stale, and browser Delete
  evidence therefore could not be reached.
- Mobile, Fleet/unauthorized browser checks, and paired authenticated Odoo
  comparison were not completed. Screenshot: `/tmp/employees-departure-final-desktop.png`
  (outside Git).
- Existing functional evidence: Employees focused lifecycle **12 tests / 167
  assertions**, UI audit **661 pages / 670 routes / 1,154 datasources**, plus
  candidate ESLint and diff-check evidence.

### Bounded verdict — **CONDITIONAL FAIL / not ready for reviewer reconciliation**

Employee creation passes in browser, but detail navigation and archive/restore,
stale/permission, mobile, Delete, and paired Odoo gates remain unverified.

## Coordinator reconciliation: departure-reasons navigation repair `1dc77ba2` (2026-09-13)

- Ownership and scope are valid. The active branch already contains the exact
  bounded candidate, including the generated-ID collision guard returning 409
  `EMPLOYEES_DEPARTURE_REASON_EXISTS`, `click_to_edit: false` page binding, and
  the minimal shared ListView/renderer plumbing required to honor that binding.
  No duplicate cherry-pick was created.
- Active verification passed: Departure Reasons **3 tests / 60 assertions**;
  full Employees **12 tests / 167 assertions**; UI audit **661 pages / 670
  routes / 1,154 datasources**. Candidate ESLint, diff-check, and clean
  worktree evidence are retained.
- Bounded disposition: **conditionally reconciled as already integrated**.
  Browser detail/lifecycle, broader actor/restart, and paired Odoo gates remain
open; Employees is not signed off.

## Reviewer reconciliation: final Departure Reasons evidence (2026-09-13)

- Active ownership/history is valid: `382a3d30` and `1dc77ba2` are present on
  the active branch. The bounded repair remains self-contained, with no
  duplicate implementation or unrelated module changes; ESLint and diff-check
  evidence pass.
- Final browser evidence passes with blockers: desktop/mobile CRUD and detail
  navigation, generated-ID duplicate 409
  `EMPLOYEES_DEPARTURE_REASON_EXISTS`, archive/restore, stale 409, missing
  delete 404, manager access, and ordinary-user denial. Focused QA is **3
  tests / 60 assertions** for Departure Reasons and full Employees is **12 /
  167**; audit is **661 / 670 / 1,154**.
- Disposition: **bounded PASS with blockers/reconciled**. Company-switch
  isolation and paired Odoo comparison remain open; no full Employees sign-off
  is claimed.

## Reviewer reconciliation: company-scope follow-up `5707df6b` (2026-09-13)

- `5707df6b` is already the active branch `HEAD`; ownership and ancestry are
  valid, and no duplicate merge or unrelated module change was made. The
  company-scope migration, API predicates/guards, and focused regressions are
  present. Candidate lint and diff-check evidence pass.
- Active verification passes **13 focused tests / 175 assertions**; full module
  evidence is **57 tests / 684 assertions**; audit passes **661 pages / 670
  routes / 1,154 datasources**.
- Browser/API evidence is conditional: switching to the Vietnam company
  returned HTTP 200 but the bearer token retained the old company context and
  rows remained unchanged. Odoo was reachable, but `admin/admin` returned HTTP
  400, so authenticated comparison is unavailable.
- Disposition: **bounded conditional reconciliation**. Company-switch token
  refresh and authenticated Odoo comparison remain blockers; Employees is not
  fully signed off.

## Reviewer reconciliation: datasource company propagation `77bebdf5` (2026-09-13)

- Ownership and scope are valid. `77bebdf5` is already present in the active
  ancestry and its final three-file product/test tree matches active: the
  shared `/api/pages` and `/api/query` routes now derive and pass
  `current_company_name` from the authenticated user company. No duplicate
  implementation or unrelated module change was made.
- Active focused prerequisite test passes **2 tests / 13 assertions**; full
  Employees evidence is **58 tests / 692 assertions**; audit passes **661
  pages / 670 routes / 1,154 datasources**. Candidate ESLint and diff-check
  evidence pass.
- The regression proves rehydrated auth context scopes both page and query
  datasource results. Real runtime evidence remains blocked: company switch
  returns HTTP 200 but the bearer token remains scoped to the old company and
  rows are unchanged; Odoo `admin/admin` returns HTTP 400.
- Disposition: **bounded conditional reconciliation, already integrated**.
  Token refresh and authenticated Odoo comparison remain blockers; Employees is
  not fully signed off.

## Bounded live company-switch trace after `a6b09d14` (2026-09-13)

- Reproduction used the live Core3 HTTP contracts with the seeded admin account
  (`admin@tms.local` / `admin123`) and the same bearer token throughout.
- `POST /api/v1/company/switch` with `{"company_id":"company-vietnam"}`
  returned **HTTP 200** and the Vietnam company object.
- The subsequent `GET /api/auth/me` using the unchanged bearer token returned
  `company_id: "company-vietnam"` and the Vietnam company object. This proves
  the auth service rehydrates the selected company from the persisted profile;
  token rotation is not required by the current auth contract.
- The subsequent Employees page datasource request on the fresh in-memory
  runtime returned no departure rows after the switch; that runtime had no
  Vietnam departure-reason fixture to compare against Demo Company rows.
  No client/auth repair was justified from this run.
- The actual browser/UI reproduction could not be completed in this bounded
  trace: the dev runtime repeatedly became unreachable on `127.0.0.1:3001` and
  `localhost:3002` during Playwright navigation, despite initially reporting
  startup. The interactive Playwright handle is not exposed in this session.
  UI request capture, profile refresh callback, and the post-switch datasource
  request therefore remain uncertified.
- Disposition: **BLOCKED** — stable live runtime plus browser network evidence
  with company fixtures is still required. No speculative auth/client edit or
  unrelated module change was made.

## Employees deterministic company-switch fixtures (2026-09-13)

- Scope: Employees departure reasons only. Added migration
  `20260913140000-026-departure-reason-demo-companies.yaml`, which keeps the
  three deterministic defaults on `Core3 Demo Company` and seeds
  `departure-reason-vietnam-transfer` / `Vietnam Transfer` and
  `departure-reason-vietnam-contract` / `Vietnam Contract End` on
  `Core3 Vietnam Branch`. The migration is idempotent and does not change the
  existing company predicates, permission declarations, or lifecycle guards.
- Focused company-switch regression: **15 tests / 193 assertions passed**.
  It verifies both page and `/api/query` datasource requests return the three
  Demo rows before switching, then return only the two Vietnam rows after the
  authenticated company context changes; old-company IDs are excluded.
- Full Employees integration suite: **58 tests / 697 assertions passed** across
  17 files.
- UI audit: **661 pages / 670 routes / 1,154 datasources passed**.
- Targeted Employees ESLint: **passed**. `git diff --check`: **passed**.
- Full repository ESLint remains blocked by three pre-existing unrelated
  errors: unused `api` in `test/spreadsheet.integration.test.ts` and two
  unsafe optional-chaining errors in `test/website_public.integration.test.ts`.
- No browser or authenticated Odoo sign-off is claimed. No unrelated module
  files were changed.

## Reviewer reconciliation: deterministic company fixtures `0a04f9ac` (2026-09-13)

- `0a04f9ac` is already the active `HEAD`; ownership and scope are valid. It
  adds only Employees migration `20260913140000-026` and related test updates,
  preserving the existing company predicates and routing fix. No duplicate
  implementation or unrelated module change was made.
- Active verification passes **58 tests / 697 assertions** across 17 files;
  audit passes **661 pages / 670 routes / 1,154 datasources**. Targeted
  Employees ESLint and diff-check pass. Full-repository lint remains blocked by
  three unrelated pre-existing Spreadsheet/Website errors.
- The deterministic two-company fixture makes page and `/api/query` scope
  assertions concrete. Runtime company-switch token refresh and authenticated
  Odoo comparison remain blockers; no browser/Odoo sign-off is added.
- Disposition: **bounded conditional reconciliation, already integrated**;
  Employees remains unsigned-off.

## Final company/Odoo runtime reconciliation (2026-09-13)

- Runtime/browser evidence passes against the integrated Employees implementation:
  backend and frontend returned HTTP 200, mediator was listening, and the
  authenticated Demo admin switched Demo → `company-vietnam` with HTTP 200 and
  exactly two Vietnam-only rows, then switched back to exactly three Demo rows
  (`Fired`, `Resigned`, `Retired`). Core3 desktop and mobile checks passed.
- Odoo Employees loaded at both desktop and mobile viewports. The Odoo
  Departure Reasons list/detail/action was not reached, so that paired scope
  remains unverified.
- No distinct `/api/query` request was observed in the runtime trace. Rendered
  page datasource data verified the company boundary, but direct `/api/query`
  browser evidence remains open; contract coverage still exists in the focused
  tests.
- Disposition: **bounded runtime PASS with explicit evidence gaps**. No
  implementation change or unsupported sign-off is made; Employees remains
  conditional pending direct `/api/query` observation and Odoo Departure
Reasons comparison.

## Reviewer reconciliation: final Odoo/company QA handoff (2026-09-13)

- The linked QA handoff is accepted for the bounded list/company-context
  surface: Odoo menu `hr.menu_hr_departure_reason_tree` opened `/odoo/action-400`;
  Odoo and Core3 desktop/mobile lists both showed `Fired`, `Resigned`, and
  `Retired`. Core3 detail Edit/Archive and Odoo create/inline-edit states were
  reachable. Existing Demo ↔ Vietnam company-context evidence remains valid.
- Verdict: **PASS for list and company context; PARTIAL for full parity**.
  Odoo exposes inline editing from this list action rather than a separate
  detail/action state, so no unsupported equivalence is claimed.
- Remaining gaps are explicit: no distinct browser `/api/query` request was
  observed (rendered datasource data was verified), and Odoo Departure Reasons
  detail/action state was not reached. No implementation files were changed.

## EMP-TEMPLATE-LOAD-001 evidence ledger (2026-09-20)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-010 | Odoo Load a Template wizard, employee/version copy, retry and restart | pass; 4 focused tests / 26 assertions |
| EMP-PERM-010 | employees.write, active/company/template and stale guards | pass; rejected writes leave both records unchanged |
| EMP-UI-006 | Authenticated Core3/Odoo desktop/mobile Payroll/modal comparison | Odoo pass; Core3 exact blocker recorded because active company `Core3 Vietnam Branch` has no seeded employee rows for `Core3 Vietnam` |

Evidence is under `evidence/employees/2026-09-20/EMP-TEMPLATE-LOAD-001/`.
This bounded slice is not module sign-off; the Core3 fixture-company blocker and
broader Employees parity review remain conditional.

## EMP-BARCODE-GENERATE-001 evidence ledger (2026-09-20)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-011 | Odoo Settings Generate Badge ID; deterministic Core3 employee update and retry | pass; 4 focused tests / 23 assertions |
| EMP-PERM-011 | Authenticated actor, employees.write, active/current-company, stale and uniqueness boundaries | pass; rejected writes leave employee unchanged |
| EMP-DATA-011 | Unique barcode migration replay and file-backed restart | pass; `041000000003` and row version 2 survive restart |
| EMP-UI-007 | Authenticated Core3/Odoo desktop/mobile Settings comparison | Odoo pass at 1440x900 and 390x844; Core3 exact blocker recorded because session `Core3 Demo Company` has no `Core3 Vietnam` fixture row |

Evidence is under `evidence/employees/2026-09-20/EMP-BARCODE-GENERATE-001/`.
Focused verification is **4 tests / 23 assertions**; the full Employees suite
is **65 tests / 658 assertions** across 21 files; audit is **673 pages / 682
routes / 1,219 datasources**; focused ESLint and diff-check pass.
The bounded feature is not module sign-off; the Core3 company-context blocker,
separate Print Badge report, and broader Employees parity review remain open.

## EMP-PRINT-BADGE-001 evidence ledger (2026-09-20)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-012 | Employee Settings Print Badge report and durable print-run history | pass; 4 focused tests / 30 assertions |
| EMP-PERM-012 | employees.read, actor/company identity, barcode-required and stale boundaries | pass; rejected requests create no report history |
| EMP-DATA-012 | Report history migration replay and file-backed restart | pass |
| EMP-UI-008 | Authenticated Core3/Odoo desktop/mobile Print Badge comparison | Odoo pass and PDF download observed; Core3 exact pre-auth Auth schema blocker captured at both viewports |

Evidence is under `evidence/employees/2026-09-20/EMP-PRINT-BADGE-001/`.
The full Employees rerun records **57 pass / 12 fail across 69 tests** because
the unrelated concurrent Surveys change duplicates `print_survey_results`
during global discovery. Employees-scoped ESLint and diff-check pass; no
aggregate module sign-off is claimed.

## EMP-LOAD-SAMPLE-DATA-001 evidence ledger (2026-09-20)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-013 | Empty Employees Load Sample Data, deterministic rows, retry | pass; 3 focused tests / 21 assertions |
| EMP-PERM-013 | Authenticated actor, employees.write, current-company and non-empty guards | pass in mutation tests; Fleet browser received 403 and did not see the action |
| EMP-DATA-013 | Migration replay and DuckDB restart | pass; audit row and three employees persisted |
| EMP-UI-009 | Authenticated Core3/Odoo desktop and mobile | Core3 pass after toolbar binding repair; Odoo seeded non-empty list pass, empty-state action comparison blocked by 24 existing reference employees |

Evidence is under
`evidence/employees/2026-09-20/EMP-LOAD-SAMPLE-DATA-001/`. The module rerun
was **78 passed / 8 failed across 24 files** because the concurrent shared
Inventory changes reference missing actions during global discovery; this is
not an Employees failure. The repository audit has the same external blocker.
No aggregate Employees sign-off is claimed.

## EMP-RELATED-USER-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-042 | Existing Related User options, assignment, clear, and read projection | pass; `user-disp` assignment and clear persist `auth_user_id`, `user_name`, and row version |
| EMP-PERM-042 | `auth.users.manage`, actor, active/current company, enabled identity, duplicate-link, and row version | pass; missing actor, stale, wrong-company, invalid, and duplicate requests reject atomically |
| EMP-DATA-042 | Migration replay and file-backed restart | pass; local deterministic auth-identity projection and employee relation survive restart without duplicates |
| EMP-UI-038 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo Settings > User is visible at both viewports; Core3 route is authenticated but fixture-company blocked |

Focused test: `test/employees_related_user.integration.test.ts` (4 tests,
24 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-RELATED-USER-001/`. The Employees service
has no live cross-service auth-user/company resolver, so the local catalog
projection and company-label mismatch are explicit blockers. No aggregate
Employees sign-off is claimed.

## EMP-EMPLOYEE-ARCHIVE-RELATION-CLEANUP-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-057 | Odoo archive cleanup of manager/coach and active Employee Records links | pass; dependent same-company links clear atomically and the archived row is persisted |
| EMP-PERM-057 | `employees.write`, current company, missing record, and stale row version | pass; invalid requests leave the target, dependents, and cleanup events unchanged |
| EMP-DATA-057 | Migration replay and file-backed restart | pass; archive state, cleared links, active projections, and cleanup event survive restart without duplicates |
| EMP-UI-053 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 discovery is blocked by existing `components[1].title is not allowed`; Odoo rejected `admin/admin` and then rate-limited |

Focused test: `test/employees_archive_relation_cleanup.integration.test.ts`
(4 tests, 30 assertions). Adjacent scoped run: 25 tests passed, with 1
pre-existing discovery failure across 214 attempted assertions. No aggregate
Employees sign-off is claimed.

## EMP-EMPLOYEE-BULK-CREATE-USERS-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-056 | Odoo list `Create User` action for selected employees | pass; eligible employees receive durable invite-pending users and links, while source-defined skipped outcomes are recorded |
| EMP-PERM-056 | `auth.users.manage`, actor, company, active selection, and stale row version | pass; permission, actor, company, missing, and stale requests reject atomically |
| EMP-DATA-056 | Migration replay and file-backed restart | pass; run/line audit and user links survive restart; retries do not duplicate users |
| EMP-UI-052 | Authenticated Core3/Odoo desktop and mobile | conditional; exact runtime and Odoo credential/fixture blockers are recorded |

Focused test: `test/employees_bulk_create_users.integration.test.ts` (5 tests,
28 assertions). Scoped audit, ESLint, and diff-check results are recorded with
the feature commit. No aggregate Employees sign-off is claimed.

## EMP-BANK-ACCOUNT-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-014 | Personal bank-account add/edit/delete and allocation | Durable line-item CRUD with allocation guard | pass; 4 focused tests / 32 assertions |
| EMP-PERM-014 | Actor, company, active, duplicate, and row-version boundaries | Unauthorized or stale mutations reject atomically | pass |
| EMP-DATA-014 | Migration replay and file-backed restart | Seeded bank rows and mutations survive restart | pass |
| EMP-UI-010 | Authenticated Core3/Odoo desktop and mobile | Populated grid/modal comparison | conditional; Core3 company mismatch and Odoo has no bank-account reference data |

Evidence: evidence/employees/2026-09-20/EMP-BANK-ACCOUNT-001/. No aggregate
Employees sign-off is claimed.

## EMP-WORK-MOBILE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-032 | Work Mobile create/edit/read | pass; mobile phone persists through employee CRUD |
| EMP-PERM-032 | `employees.write`, current company, row version | pass; stale and out-of-company changes reject atomically |
| EMP-DATA-032 | Migration replay and file-backed restart | pass; deterministic Work Mobile fixtures survive restart without duplicates |
| EMP-UI-028 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo label passes at both viewports with empty reference value, Core3 is blocked before authentication by concurrent Inventory discovery failure |

Evidence is under
`evidence/employees/2026-09-21/EMP-WORK-MOBILE-001/`. No aggregate
Employees sign-off is claimed.

## EMP-DOCUMENTS-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-031 | Personal Documents presence/filename create/edit/read | pass; ID card and driving-license metadata persist through employee CRUD |
| EMP-PERM-031 | `employees.write`, current company, row version, filename invariants | pass; invalid, stale, and out-of-company changes reject atomically |
| EMP-DATA-031 | Migration replay and file-backed restart | pass; deterministic document metadata survives restart without duplicates |
| EMP-UI-027 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo Documents group passes at both viewports, Core3 is blocked before authentication by concurrent Inventory discovery failure |

Evidence is under
`evidence/employees/2026-09-21/EMP-DOCUMENTS-001/`. The bounded Core3
contract does not claim binary upload; this is recorded alongside the exact
runtime blocker. No aggregate Employees sign-off is claimed.

## EMP-BIRTH-IDENTITY-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-018 | Personal birth identity create/edit/read | Place, country, and gender persist through CRUD | pass; 4 tests / 21 assertions |
| EMP-PERM-018 | Gender, company, stale, and write guards | Invalid, cross-company, or stale mutations reject atomically | pass |
| EMP-DATA-018 | Migration replay and file-backed restart | Deterministic birth fields survive restart | pass |
| EMP-UI-014 | Authenticated Core3/Odoo Personal desktop/mobile | Responsive comparison | conditional; Core3 values are company-scoped out, Odoo exact Country of Birth label absent |

Evidence: `evidence/employees/2026-09-20/EMP-BIRTH-IDENTITY-001/`. No
aggregate Employees sign-off is claimed; full-repository regression was not
run for this bounded checkpoint.

## EMP-EMPLOYEE-SKILLS-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-019 | Work-tab skill add/archive | Skill category, skill, level, and validity persist; archive hides the row | pass; 4 tests / 27 assertions |
| EMP-PERM-019 | Actor, company, relation, duplicate, date, and stale guards | Invalid or out-of-scope assignment rejects atomically | pass |
| EMP-DATA-019 | Migration replay and file-backed restart | Deterministic assignments survive restart without duplicates | pass |
| EMP-UI-015 | Authenticated Core3/Odoo Work-tab desktop/mobile | Skills grid and modal compare responsively | conditional; Core3 fixture-company mismatch and Odoo unpopulated widget recorded |

Evidence: `evidence/employees/2026-09-20/EMP-EMPLOYEE-SKILLS-001/`. No
aggregate Employees sign-off is claimed; full-repository regression was not
run per the bounded checkpoint.

## EMP-RESUME-LINES-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-020 | Resume-tab line add/edit/delete | Education, experience, and training lines persist through CRUD | pass; 4 tests / 30 assertions |
| EMP-PERM-020 | Actor, company, type, date, duplicate, and stale guards | Invalid or out-of-scope resume mutations reject atomically | pass |
| EMP-DATA-020 | Migration replay and file-backed restart | Deterministic resume lines survive restart without duplicates | pass |
| EMP-UI-016 | Authenticated Core3/Odoo Resume desktop/mobile | Resume line grid/form compares responsively | conditional; Core3 fixture-company mismatch and empty Odoo reference recorded |

Evidence: `evidence/employees/2026-09-20/EMP-RESUME-LINES-001/`. No aggregate
Employees sign-off is claimed; full-repository regression was not run.

## EMP-CREATE-USER-001 execution (2026-09-20)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-021 | ERP-manager employee-form Create User modal | Odoo modal opens with deterministic Name, Login, and Phone defaults; Core3 contract creates an invited disabled user and links it atomically | pass; 4 focused tests / 30 assertions |
| EMP-PERM-021 | `auth.users.manage`, actor, current company, login uniqueness, existing link, and stale employee | Invalid or out-of-scope requests reject without partial user or employee mutation | pass |
| EMP-DATA-021 | Migration replay and file-backed restart | Invited auth user and employee link survive restart | pass |
| EMP-UI-017 | Authenticated Core3/Odoo desktop and mobile | Odoo modal pass at 1440x900 and 390x844; Core3 exact fixture-company blocker recorded, and missing-record action visibility is fixed | conditional |

Evidence: `evidence/employees/2026-09-20/EMP-CREATE-USER-001/`. Core3
fixture `Core3 Vietnam` does not match the authenticated `Core3 Demo Company`;
Odoo has seven unrelated app-icon 404s. No aggregate Employees sign-off is
claimed.

## EMP-BANK-TRUST-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-023 | Personal bank-account trust toggle | pass; durable trusted flag toggles and returns the updated row |
| EMP-PERM-023 | `employees.write`, actor, company, parent row, and bank row versions | pass; unauthorized, out-of-scope, and stale writes are rejected atomically |
| EMP-DATA-023 | Existing bank-account migration replay and file-backed restart | pass; trusted state and both row versions survive restart |
| EMP-UI-019 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 blocked before authentication by `PageSchemaError: actions[4].fields is not allowed`; Odoo reference employee has no bank-account rows |

Evidence is under
`evidence/employees/2026-09-21/EMP-BANK-TRUST-001/`. This is a bounded
conditional slice, not aggregate Employees sign-off.

## EMP-BANK-ALLOCATION-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-024 | Personal bank-account allocation wizard | pass; line edits and exact-100% save audit persist durably |
| EMP-PERM-024 | `employees.write`, actor, company, parent/line concurrency, allocation validation | pass; rejected changes are atomic |
| EMP-DATA-024 | Migration replay and file-backed restart | pass; line values and save history survive restart |
| EMP-UI-020 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture company differs from session; Odoo reference employee has no bank-account rows |

Evidence is under
`evidence/employees/2026-09-21/EMP-BANK-ALLOCATION-001/`. No aggregate
Employees sign-off is claimed.

## EMP-VISA-WORK-PERMIT-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-025 | Personal Visa & Work Permit create/edit/read | pass; visa/permit numbers, expiries, and document metadata persist through employee CRUD |
| EMP-PERM-025 | `employees.write`, current company, row version, date, document metadata | pass; invalid, stale, and out-of-company changes reject atomically |
| EMP-DATA-025 | Migration replay and file-backed restart | pass; deterministic visa/work permit fixtures survive restart without duplicates |
| EMP-UI-021 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 labels/page 200 are company-blocked, Odoo source group is visible, binary upload is an explicit follow-up |

Evidence is under
`evidence/employees/2026-09-21/EMP-VISA-WORK-PERMIT-001/`. Core3's authenticated
session is `Core3 Demo Company` while deterministic employee fixtures are
`Core3 Vietnam`; Odoo has seven unrelated app-icon 404s. No aggregate Employees
sign-off is claimed.

## EMP-WORK-ADDRESS-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-040 | Employee Work Address assignment | pass; selected address persists on employee and active Payroll record |
| EMP-PERM-040 | `employees.write`, actor, current company, active address/version, row version | pass; actor, invalid, stale, and wrong-company requests reject atomically |
| EMP-DATA-040 | Migration replay and file-backed restart | pass; deterministic address relations survive restart without duplicates |
| EMP-UI-036 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo Work Address is visible at both viewports, while Core3 startup is blocked by unrelated page schema validation |

Focused test: `test/employees_work_address_assignment.integration.test.ts` (4
tests, 22 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-WORK-ADDRESS-001/`. No aggregate Employees
sign-off is claimed.

## EMP-MANAGER-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-038 | Employee Manager relation options/read/update | pass; same-company manager assignments persist on the employee and active Payroll version, with display and org-chart projections synchronized |
| EMP-PERM-038 | `employees.write`, actor, active/current company, active manager, self/cycle, row version | pass; actor, stale, wrong-company, invalid, self, and subordinate-cycle requests reject atomically |
| EMP-DATA-038 | Migration replay and file-backed restart | pass; manager relation and active Payroll projection survive replay/restart without duplicates |
| EMP-UI-034 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo desktop/mobile show Manager, while Core3 backend startup hit a DuckDB migration constraint error before port 3001 bound |

Focused test: `test/employees_manager_assignment.integration.test.ts` (4
tests, 24 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-MANAGER-001/`. Scoped audit/lint/diff-check
results are recorded with the local commit. No aggregate Employees sign-off is
claimed.

## EMP-WORK-LOCATION-ASSIGNMENT-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-039 | Employee Work Location assignment | pass; selected location persists on employee and active Payroll record |
| EMP-PERM-039 | `employees.write`, actor, current company/address, active location/version, row version | pass; actor, invalid, stale, and wrong-company requests reject atomically |
| EMP-DATA-039 | Migration replay and file-backed restart | pass; deterministic location relations and display names survive restart without duplicates |
| EMP-UI-035 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo control appears at both viewports, while Core3 backend port 3001 did not bind during bounded startup |

Focused test: `test/employees_work_location_assignment.integration.test.ts` (4
tests, 20 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-WORK-LOCATION-ASSIGNMENT-001/`. Odoo
reference data does not populate the selected employee's value; this is a
comparison limitation, not a sign-off. No aggregate Employees sign-off is
claimed.

## EMP-WORKING-HOURS-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-038 | Employee Payroll Working Hours assignment | pass; selected schedule persists on employee and active Payroll record |
| EMP-PERM-038 | `employees.manage`, actor, current company, active schedule/version, row version | pass; actor, invalid schedule, stale, and wrong-company requests reject atomically |
| EMP-DATA-038 | Migration replay and file-backed restart | pass; deterministic schedule relations and display names survive restart without duplicates |
| EMP-UI-034 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo label appears at both viewports, while Core3 backend port 3001 did not bind during bounded startup |

Focused test: `test/employees_working_hours.integration.test.ts` (4 tests,
20 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-WORKING-HOURS-001/`. Odoo reference data
does not populate the selected employee's Working Hours value; this is recorded
as a comparison limitation, not a sign-off. No aggregate Employees sign-off is
claimed.

## EMP-CITIZENSHIP-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-026 | Personal Citizenship create/edit/read | pass; nationality, identification, SSN, passport, and expiry persist through employee CRUD |
| EMP-PERM-026 | `employees.write`, current company, row version, passport date | pass; invalid, stale, and out-of-company changes reject atomically |
| EMP-DATA-026 | Migration replay and file-backed restart | pass; deterministic citizenship fixtures survive restart without duplicates |
| EMP-UI-022 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 labels/page 200 are company-blocked, Odoo source group is visible |

Evidence is under
`evidence/employees/2026-09-21/EMP-CITIZENSHIP-001/`. Core3's authenticated
session is `Core3 Demo Company` while deterministic employee fixtures are
`Core3 Vietnam`; Odoo has seven unrelated app-icon 404s. No aggregate Employees
sign-off is claimed.

## EMP-PRIVATE-LOCATION-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-027 | Personal Location create/edit/read | pass; structured private address and distance/unit persist through employee CRUD |
| EMP-PERM-027 | `employees.write`, current company, row version, distance/unit guards | pass; invalid, stale, and out-of-company changes reject atomically |
| EMP-DATA-027 | Migration replay and file-backed restart | pass; deterministic private-location fixtures survive restart without duplicates |
| EMP-UI-023 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo source group captured, Core3 blocked by unrelated Inventory page schema error |

Evidence is under
`evidence/employees/2026-09-21/EMP-PRIVATE-LOCATION-001/`. Core3 startup and
shared audit fail on `components[1].search.lots` and
`components[1].search.or packages... is not allowed` in an Inventory page;
Inventory remains untouched. Odoo has seven unrelated app-icon 404s. No
aggregate Employees sign-off is claimed.

## EMP-PRIVATE-CONTACT-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-028 | Personal Private Contact create/edit/read | pass; private email and source-named private phone persist through employee CRUD |
| EMP-PERM-028 | `employees.write`, current company, row version | pass; stale and out-of-company changes reject atomically |
| EMP-DATA-028 | Migration replay and file-backed restart | pass; deterministic private-contact fixtures survive restart without duplicates |
| EMP-UI-024 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 labels/page 200 are company-blocked, Odoo source group is visible |

Evidence is under
`evidence/employees/2026-09-21/EMP-PRIVATE-CONTACT-001/`. Core3's authenticated
session is `Core3 Demo Company` while deterministic employee fixtures are
`Core3 Vietnam`; Odoo has seven unrelated app-icon 404s. No aggregate Employees
sign-off is claimed.

## EMP-EMERGENCY-CONTACT-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-015 | Personal emergency contact create/edit/read | Contact and phone persist through employee CRUD | pass; 3 focused tests / 21 assertions |
| EMP-PERM-015 | Employees read/write, current company, stale and missing employee | Read is authenticated; invalid edits reject without mutation | pass |
| EMP-DATA-015 | Migration replay and file-backed restart | Deterministic emergency fields survive restart | pass |
| EMP-UI-011 | Authenticated Core3/Odoo desktop and mobile | Personal tab exposes Emergency Contact responsively | conditional; Odoo pass, Core3 blocked by unrelated shared page-discovery schema error |

Evidence: `evidence/employees/2026-09-20/EMP-EMERGENCY-CONTACT-001/`.

## EMP-FAMILY-INFO-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-016 | Personal Family create/edit/read | Marital, spouse, birthdate, and child count persist through employee CRUD | pass; 4 focused tests / 24 assertions |
| EMP-PERM-016 | Employees read/write, company, stale, invalid marital/date/count | Invalid or out-of-scope edits reject atomically | pass |
| EMP-DATA-016 | Migration replay and file-backed restart | Deterministic family fields survive restart | pass |
| EMP-UI-012 | Authenticated Core3/Odoo desktop and mobile | Family group and conditional spouse fields render responsively | pass; Odoo shell noise documented |

Evidence: `evidence/employees/2026-09-20/EMP-FAMILY-INFO-001/`.

## EMP-EDUCATION-001 execution (2026-09-20)

| Case ID | Workflow/action | Expected result | Status |
| --- | --- | --- | --- |
| EMP-WF-017 | Personal Education create/edit/read | Certificate and field of study persist | pass; 4 tests / 21 assertions |
| EMP-PERM-017 | Employees write/company/stale/invalid certificate | Invalid or out-of-scope edits reject atomically | pass |
| EMP-DATA-017 | Migration replay and restart | Deterministic education fields survive restart | pass |
| EMP-UI-013 | Authenticated Core3/Odoo desktop/mobile | Education group renders responsively | conditional; Core3 shared discovery blocker, Odoo linked capture pass |

Evidence: `evidence/employees/2026-09-20/EMP-EDUCATION-001/`. No aggregate
Employees sign-off is claimed.

## EMP-EMPLOYEE-VERSION-DETAIL-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-022 | Employee Records row-open version snapshot | Odoo `hr.version` row opens the employee context; Core3 list row/double-click opens the read-only version detail route | pass; 3 focused tests / 21 assertions |
| EMP-PERM-022 | `employees.read` and current-company boundary | Version detail returns no record outside the current company; no write actions are exposed | pass |
| EMP-DATA-022 | Current/future/expired/archived fixtures and restart | Existing deterministic version snapshots survive migration replay and file-backed restart | pass |
| EMP-UI-018 | Authenticated Core3/Odoo desktop and mobile | Core3 routes pass with zero errors but populated fixture is company-blocked; Odoo desktop list/detail and mobile detail are authenticated | conditional |

Evidence: `evidence/employees/2026-09-21/EMP-EMPLOYEE-VERSION-DETAIL-001/`.
Core3 fixture company is `Core3 Vietnam` versus session `Core3 Demo Company`;
Odoo mobile uses the authenticated resolved detail route because the compact
list rendered no `.o_data_row` nodes. No aggregate Employees sign-off is
claimed.

## EMP-BIRTHDAY-VISIBILITY-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-029 | Personal birthday visibility and public-directory projection | pass; opted-in day/month is projected and opt-out is hidden |
| EMP-PERM-029 | `employees.write`, current company, row version | pass; stale and out-of-company changes reject atomically |
| EMP-DATA-029 | Migration replay and file-backed restart | pass; deterministic birthday/visibility fixtures survive restart without duplicates |
| EMP-UI-025 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture-company mismatch, Odoo reference employee has no birthday so source checkbox is hidden |

Evidence is under
`evidence/employees/2026-09-21/EMP-BIRTHDAY-VISIBILITY-001/`. No aggregate
Employees sign-off is claimed.

## EMP-LEGAL-NAME-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-030 | Personal Information legal-name create/edit/read | pass; omitted legal name follows Odoo's name fallback and explicit edits persist |
| EMP-PERM-030 | `employees.write`, current company, row version | pass; stale and out-of-company changes reject atomically |
| EMP-DATA-030 | Migration replay and file-backed restart | pass; deterministic legal names survive restart without duplicates |
| EMP-UI-026 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo source field is visible, Core3 desktop is company-blocked, and mobile is blocked by concurrent Inventory discovery failure |

Evidence is under
`evidence/employees/2026-09-21/EMP-LEGAL-NAME-001/`. The Core3 mobile
500 is recorded in `browser.json`; runtime logs identify unresolved Inventory
route datasources/actions, not an Employees contract failure. No aggregate
Employees sign-off is claimed.

## EMP-CONTRACT-TYPE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-031 | Payroll Contract Type create/read/update | pass; employee projection and current active version persist the selected supported type |
| EMP-PERM-031 | `employees.manage`, actor, active/current company, row version, supported values | pass; actor, stale, wrong-company, and invalid-type requests reject atomically |
| EMP-DATA-031 | Migration replay and file-backed restart | pass; Permanent/Temporary/Contractor fixtures remain deterministic |
| EMP-UI-027 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture-company boundary and empty Odoo reference value are recorded |

Focused test: `test/employees_contract_type.integration.test.ts` (4 tests,
20 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-CONTRACT-TYPE-001/`. Core3 returned 200
without browser/request errors or overflow; Odoo's seven app-icon 404s are
unrelated shell noise. No aggregate Employees sign-off is claimed.

## EMP-HR-RESPONSIBLE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-032 | Settings Approvers HR Responsible create/read/update | pass; employee projection and current active version persist the selected supported approver |
| EMP-PERM-032 | `employees.write`, actor, active/current company, row version, supported values | pass; actor, stale, wrong-company, and invalid-approver requests reject atomically |
| EMP-DATA-032 | Migration replay and file-backed restart | pass; HR Manager / People Operations fixtures remain deterministic |
| EMP-UI-028 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture-company boundary and empty Odoo reference approver are recorded |

Focused test: `test/employees_hr_responsible.integration.test.ts` (4 tests,
20 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-HR-RESPONSIBLE-001/`. Core3 returned 200
without browser/request errors or overflow; Odoo's seven app-icon 404s are
unrelated shell noise. No aggregate Employees sign-off is claimed.

## EMP-ATTENDANCE-PIN-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-033 | Settings Attendance / Point of Sale PIN create/read/update | pass; numeric PIN persists through employee CRUD and can be cleared |
| EMP-PERM-033 | `employees.write`, actor, active/current company, row version, digits-only validation | pass; actor, stale, wrong-company, and invalid-PIN requests reject atomically |
| EMP-DATA-033 | Migration replay and file-backed restart | pass; deterministic PIN fixtures remain stable without duplicates |
| EMP-UI-029 | Authenticated Core3/Odoo desktop and mobile | conditional; captures record the PIN control, viewport checks, and any fixture/reference blockers |

Focused test: `test/employees_attendance_pin.integration.test.ts` (4 tests,
20 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-ATTENDANCE-PIN-001/`. No aggregate
Employees sign-off is claimed.

## EMP-COACH-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-034 | Employee coach list projection and create/edit/read | pass; durable coach relation is projected, created, edited, and returned |
| EMP-PERM-034 | `employees.write`, actor, active/current company, row version, active coach | pass; actor, stale, wrong-company, and invalid-coach requests reject atomically |
| EMP-DATA-034 | Migration replay and file-backed restart | pass; deterministic coach fixtures survive replay and restart without duplicates |
| EMP-UI-030 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture company differs from session company and Odoo optional Coach column is hidden by default |

Focused test: `test/employees_coach.integration.test.ts` (4 tests, 23
assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-COACH-001/`. The focused UI audit passed
with 712 pages, 721 routes, and 1,359 datasources; scoped ESLint and
`git diff --check` passed. No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-PROPERTIES-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-035 | Employee Properties create/read/update | pass; opaque company-defined object persists through employee CRUD |
| EMP-PERM-035 | `employees.write`, actor, active/current company, row version, object validation | pass; actor, stale, wrong-company, and invalid-object requests reject atomically |
| EMP-DATA-035 | Migration replay and file-backed restart | pass; deterministic Properties fixtures survive replay and restart without duplicates |
| EMP-UI-031 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo source definition is empty and Core3 backend startup was unavailable |

Focused test: `test/employees_properties.integration.test.ts` (4 tests, 19
assertions), with adjacent coach regression at 8 tests / 42 assertions.
Evidence is under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-PROPERTIES-001/`. UI audit passed
with 714 pages, 723 routes, and 1,364 datasources; scoped ESLint and
`git diff --check` passed. No aggregate Employees sign-off is claimed.

## EMP-PRIVATE-CAR-PLATE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-036 | Employees private car plate create/read/edit/search projection | pass; durable plate values are created, returned, edited, and included in the list query |
| EMP-PERM-036 | `employees.read`/`employees.write`, current company, row version | pass; source/API permission declarations and stale/wrong-company guards reject atomically |
| EMP-DATA-036 | Migration replay and file-backed restart | pass; deterministic plate fixtures survive restart without duplicates |
| EMP-UI-032 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo optional search field is hidden by default, Core3 backend port 3001 did not bind during the bounded runtime attempt |

Focused test: `test/employees_private_car_plate.integration.test.ts` (4 tests,
21 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-PRIVATE-CAR-PLATE-001/`. No aggregate
Employees sign-off is claimed.

## EMP-PAY-CATEGORY-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-037 | Payroll Pay Category create/read/update projection | pass; the manager action updates both employee and active Payroll record |
| EMP-PERM-037 | `employees.manage`, actor, current company, active Payroll record, supported values, row version | pass; actor, invalid, stale, wrong-company, and missing-record requests reject atomically |
| EMP-DATA-037 | Migration replay and file-backed restart | pass; deterministic Pay Category fixtures survive restart without duplicates |
| EMP-UI-033 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo mobile shows Pay Category, desktop interaction stayed on Work, and Core3 backend port 3001 did not bind |

Focused test: `test/employees_pay_category.integration.test.ts` (4 tests, 21
assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-PAY-CATEGORY-001/`. No aggregate Employees
sign-off is claimed.

## EMP-EMPLOYEE-TYPE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-040 | Payroll Employee Type create/read/update projection | pass; the six-value source selection persists on the employee and active Payroll version and synchronizes the legacy display projection |
| EMP-PERM-040 | `employees.write`, actor, active/current company, supported value, active Payroll version, row version | pass; actor, stale, wrong-company, invalid, and missing-version requests reject atomically |
| EMP-DATA-040 | Migration replay and file-backed restart | pass; deterministic Employee Type fixtures survive replay and restart without duplicates |
| EMP-UI-036 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo desktop/mobile show Employee Type, while Core3 discovery failed on an unrelated page-schema error before backend port 3001 bound |

Focused test: `test/employees_employee_type.integration.test.ts` (4 tests,
25 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-TYPE-001/`. Scoped audit/lint/diff-check
was green for lint/diff-check; the global UI audit was blocked by the unrelated
`components[1].title is not allowed` page-schema error. No aggregate Employees
sign-off is claimed.

## EMP-CONTRACT-PERIOD-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-041 | Payroll Contract Dates create/read/update projection | pass; contract start/end persist on the employee and active Payroll version together |
| EMP-PERM-041 | `employees.manage`, actor, active/current company, active Payroll version, date format/order, row version | pass; actor, stale, wrong-company, invalid-date, invalid-order, and missing-version requests reject atomically |
| EMP-DATA-041 | Migration replay and file-backed restart | pass; deterministic Contract Dates survive replay and restart without duplicates |
| EMP-UI-037 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo shows the compact Contract date range at both viewports, while Core3 discovery is blocked by unrelated Inventory unknown actions |

Focused test: `test/employees_contract_period.integration.test.ts` (4 tests,
23 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-CONTRACT-PERIOD-001/`. Scoped lint and
diff-check pass; global audit is blocked by unrelated Inventory disallowed
action fields and Core3 discovery is blocked by unrelated Inventory action
references. No aggregate Employees sign-off is claimed.

## EMP-WAGE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-043 | Active Payroll Wage update and read projection | pass; employee and active Payroll wages persist together |
| EMP-PERM-043 | `employees.manage`, actor, current company, non-negative value, active version, and row version | pass; actor, stale, wrong-company, and invalid-wage requests reject atomically |
| EMP-DATA-043 | Migration replay and file-backed restart | pass; deterministic wage projections survive restart without duplicates |
| EMP-UI-039 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo Payroll > Wage is visible at both viewports, Core3 discovery is blocked by unrelated page schema |

Focused test: `test/employees_wage.integration.test.ts` (4 tests, 20
assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-WAGE-001/`. The exact Core3 blocker is
`actions[1].title is not allowed`; no aggregate Employees sign-off is claimed.

## EMP-JOB-POSITION-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-044 | Employee Job Position assign/read/clear | pass; relation and display projections update on employee and active Payroll records |
| EMP-PERM-044 | `employees.write`, actor, current company, active job/version, row version | pass; actor, stale, wrong-company, unsupported-job, and missing-version requests reject atomically |
| EMP-DATA-044 | Migration replay and file-backed restart | pass; deterministic job fixtures and assignment survive replay/restart |
| EMP-UI-040 | Authenticated Core3/Odoo desktop and mobile | conditional; authenticated Odoo desktop/mobile show Job Position, Core3 route attempt is recorded as connection-refused after bounded runtime exit |

Focused test: `test/employees_job_position_assignment.integration.test.ts` (4
tests, 23 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-JOB-POSITION-001/`. No aggregate Employees
sign-off is claimed.

## EMP-DEPARTMENT-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-045 | Employee Department assign/read/clear | pass; relation and display projections update on employee and active Payroll records |
| EMP-PERM-045 | `employees.write`, actor, current company, active department/version, row version | pass; actor, stale, wrong-company, unsupported-department, and missing-version requests reject atomically |
| EMP-DATA-045 | Migration replay and file-backed restart | pass; deterministic Department relation survives replay/restart |
| EMP-UI-041 | Authenticated Core3/Odoo desktop and mobile | conditional; authenticated Odoo desktop/mobile show Department, Core3 discovery is blocked by unrelated `components[4].title is not allowed` |

Focused test: `test/employees_department_assignment.integration.test.ts` (4
tests, 23 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-DEPARTMENT-001/`. No aggregate Employees
sign-off is claimed.
The global UI audit is conditional because shared page discovery currently
fails on `components[0].views[1].group_by is required for kanban`; this is
outside the Employees slice.

## EMP-EMPLOYEE-TAGS-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-046 | Odoo `category_ids` employee tag add/remove lifecycle | pass; deterministic tag relations and the employee display projection persist through CRUD |
| EMP-PERM-046 | `employees.read`/`employees.write`, actor, current company, supported/duplicate relation, and row version | pass; actor, wrong-company, stale, unsupported, duplicate, and missing-relation requests reject atomically |
| EMP-DATA-046 | Migration replay and file-backed restart | pass; deterministic tag catalog and assignments survive restart without duplicates |
| EMP-UI-042 | Authenticated Core3/Odoo desktop and mobile | conditional; both authenticated surfaces were captured, Odoo's selected fixture has no tag chips, and Core3's session company does not match deterministic Employee fixtures |

Focused checks: `test/employees_tags.integration.test.ts` plus the owned
Work-tab contract test: **7 tests, 45 assertions, 0 failures**. Evidence is
under `evidence/employees/2026-09-21/EMP-EMPLOYEE-TAGS-001/`. No aggregate
Employees sign-off is claimed.

## EMP-EMPLOYEE-TIMEZONE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-047 | Odoo `hr.employee.tz` create/read/update workflow | pass; supported timezone values persist through employee creation and guarded detail update |
| EMP-PERM-047 | `employees.write`, actor, current company, supported value, and row version | pass; missing actor, wrong company, stale, and unsupported timezone requests reject atomically |
| EMP-DATA-047 | Migration replay and file-backed restart | pass; deterministic timezone fixtures and an edited value survive restart |
| EMP-UI-043 | Authenticated Core3/Odoo desktop and mobile | conditional; captures and any fixture-company/runtime limitation are recorded in the feature evidence |

Focused test: `test/employees_timezone.integration.test.ts` (4 tests, 19
assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-TIMEZONE-001/`. No aggregate
Employees sign-off is claimed.

## EMP-TRIAL-PERIOD-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-048 | Odoo `hr.version.trial_date_end` create/read/update workflow | pass; employee and active Payroll trial dates persist together |
| EMP-PERM-048 | `employees.manage`, actor, current company, active version, date ordering, and row version | pass; actor, stale, wrong-company, invalid, and missing-version requests reject atomically |
| EMP-DATA-048 | Migration replay and file-backed restart | pass; deterministic trial dates and edited values survive restart |
| EMP-UI-044 | Authenticated Core3/Odoo desktop and mobile | conditional; Odoo base form omits the source field and Core3 fixture company does not match the authenticated company |

Focused test: `test/employees_trial_period.integration.test.ts` (4 tests,
21 assertions). Evidence is under
`evidence/employees/2026-09-21/EMP-TRIAL-PERIOD-001/`. No aggregate Employees
sign-off is claimed.

## EMP-EMPLOYEE-COMPANY-ASSIGNMENT-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-049 | Employee Work-tab Company assignment and Payroll projection | pass; employee and active Payroll company IDs/names update together |
| EMP-PERM-049 | `employees.manage`, actor, current company, active company, active Payroll version, and row version | pass; actor, stale, wrong-company, invalid-company, and missing-version requests reject atomically |
| EMP-DATA-049 | Migration replay and file-backed restart | pass; deterministic company catalog and assignments survive restart without duplicates |
| EMP-UI-045 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture-company mismatch and rejected local Odoo credential are recorded |

Focused test: `test/employees_company_assignment.integration.test.ts` (4
tests, 22 assertions). Adjacent Employees, Work-tab, Employee Type, scoped
lint, merged API/page validation, UI audit, and staged diff-check are tracked
with the commit. No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-CHATTER-NOTE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-050 | Employee chatter internal-note CRUD | pass; note is visible through the company-scoped message datasource and employee version increments |
| EMP-PERM-050 | `employees.write`, actor, current company, content, and row version | pass; actor, stale, wrong-company, invalid, and missing-employee requests reject atomically |
| EMP-DATA-050 | Migration replay and file-backed restart | pass; deterministic note and new note survive restart without duplicate seed rows |
| EMP-UI-046 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 fixture-company mismatch and rejected local Odoo credential are recorded |

Focused test: `test/employees_chatter_note.integration.test.ts` (4 tests, 19
assertions). Merged API/page validation, scoped lint, UI audit, and staged
diff-check are recorded with the commit. No aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-FOLLOWERS-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-051 | Employee chatter follower add/remove CRUD and audit events | pass; follower relation and employee message stream update together |
| EMP-PERM-051 | `employees.write`, actor, current company, candidate, relation, and row version | pass; actor, stale, wrong-company, invalid, duplicate, and missing relation requests reject atomically |
| EMP-DATA-051 | Migration replay and file-backed restart | pass; deterministic and newly-added follower relations survive restart without duplicate seeds |
| EMP-UI-047 | Authenticated Core3/Odoo desktop and mobile | conditional; exact Core3 runtime and local Odoo credential blockers are recorded |

Focused test: `test/employees_followers.integration.test.ts` (4 tests, 26
assertions). Merged API/page validation, scoped lint, UI audit, and staged
diff-check are recorded with the commit. No aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-ACTIVITY-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-052 | Employee ad-hoc Schedule activity CRUD and chatter audit | pass; durable activity and scheduled-activity message are created together |
| EMP-PERM-052 | `employees.write`, actor, current company, activity type/content/date, and row version | pass; actor, stale, wrong-company, invalid type/content/date requests reject atomically |
| EMP-DATA-052 | Migration replay and file-backed restart | pass; deterministic and newly-scheduled activities survive restart without duplicate seed rows |
| EMP-UI-048 | Authenticated Core3/Odoo desktop and mobile | conditional; exact Core3 fixture-company and local Odoo credential blockers are recorded |

Focused test: `test/employees_activity.integration.test.ts` (4 tests, 25
assertions). Merged API/page validation, scoped lint, UI audit, and staged
diff-check are recorded with the commit. No aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-CHATTER-MESSAGE-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-053 | Employee chatter Send message CRUD and audit event | pass; message is stored and returned by the company-scoped message datasource |
| EMP-PERM-053 | `employees.write`, actor, current company, content, and row version | pass; actor, stale, wrong-company, and blank-message requests reject atomically |
| EMP-DATA-053 | Migration replay and file-backed restart | pass; deterministic and newly-sent messages survive restart without duplicate seed rows |
| EMP-UI-049 | Authenticated Core3/Odoo desktop and mobile | conditional; exact Core3 fixture-company and local Odoo credential blockers are recorded |

Focused test: `test/employees_chatter_message.integration.test.ts` (4 tests,
21 assertions). Merged API/page validation, scoped lint, UI audit, and staged
diff-check are recorded with the commit. No aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-ACTIVITY-COMPLETION-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-054 | Planned Employee activity Mark done workflow | pass; activity timing/state, linked message state, employee version, and completion audit update atomically |
| EMP-PERM-054 | `employees.write`, actor, company, planned state, message identity, and row version | pass; actor, stale, wrong-company, missing, and already-completed requests reject atomically |
| EMP-DATA-054 | Migration replay and file-backed restart | pass; deterministic planned message and completed state remain durable without duplicate seed rows |
| EMP-UI-050 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 authentication succeeded but fixture company did not match the session, so Mark done was not rendered; Odoo credentials were rejected/rate-limited |

Focused test: `test/employees_activity_completion.integration.test.ts` (4
tests, 21 assertions). Adjacent chatter/activity focused run: 20 tests, 112
assertions. Merged API/page validation, scoped ESLint, UI audit, and staged
diff-check are recorded with the commit. No aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-WORK-CONTACT-PROVISION-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-WF-055 | Provision an Employee Work Contact from work name/email/phone | pass; contact creation and employee relation update atomically |
| EMP-PERM-055 | `employees.write`, actor, current company, missing-contact precondition, generated identity, and row version | pass; actor, stale, wrong-company, duplicate, and collision requests reject atomically |
| EMP-DATA-055 | Migration replay and file-backed restart | pass; provenance, copied work details, relation, and row versions remain durable without duplicate contacts |
| EMP-UI-051 | Authenticated Core3/Odoo desktop and mobile | conditional; Core3 authenticated desktop/mobile captures had no request failures or overflow but the Vietnam fixture was hidden from the Demo Company session; Odoo credentials were rejected/rate-limited |

Focused tests: `test/employees_work_contact_provisioning.integration.test.ts`
plus `test/employees_related_contacts.integration.test.ts` (8 tests, 42
assertions). UI audit passed at 753 pages, 762 routes, and 1,519 datasources;
scoped ESLint and diff-check are recorded with the commit. No aggregate
Employees sign-off is claimed.

## EMP-EMPLOYEE-EDUCATION-SCHOOL-001 execution (2026-09-21)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-058 | Odoo `study_school` model field to paired page/API contracts | pass; API reads and writes `study_school`, page renders School, and both contracts use `page.id: employee-detail` |
| EMP-WF-058 | Create/edit School education value | pass; deterministic fixture and employee CRUD persist School and increment row version |
| EMP-PERM-058 | `employees.write`, actor, company, missing, stale, and length guards | pass; invalid requests reject atomically without changing School or row version |
| EMP-DATA-058 | Migration replay and file-backed restart | pass; seeded and edited School values survive replay/reopen without duplicate migration effects |
| EMP-UI-054 | Authenticated Core3 desktop/mobile and Odoo comparison | conditional; Core3 renders School with zero failed requests but the authenticated Demo Company hides Vietnam fixture values; Odoo credentials were rejected and then rate-limited |

Focused tests: `test/employees_education_school.integration.test.ts` and the
Education regression test, **8 tests / 42 assertions**. Evidence:
`evidence/employees/2026-09-21/EMP-EMPLOYEE-EDUCATION-SCHOOL-001/`.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-CONTRACT-FILTERS-001 execution (2026-09-22)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-059 | Odoo domains and `hr.group_hr_manager` source boundary | pass |
| EMP-FUNC-059 | Current-company in/out contract results and active/archived boundary | pass |
| EMP-DATA-059 | Migration replay and file-backed restart | pass |
| EMP-PERM-059 | Exact manager-only UI filter visibility | conditional; shared schema has no filter-level permission key |
| EMP-UI-059 | Authenticated Odoo/Core3 desktop/mobile | blocked; tab ownership and all Core3 runtime ports unavailable |

Focused test: `test/employees_contract_filters.integration.test.ts` (3 tests,
22 assertions). Adjacent regression set passes 17 tests / 105 assertions.
Evidence: `evidence/employees/2026-09-22/EMP-EMPLOYEE-CONTRACT-FILTERS-001/`.

## EMP-EMPLOYEE-ORG-CHART-001 execution (2026-09-22)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-060 | Odoo `parent_id`/`child_ids` and Employee Work-tab chart mapping | pass from local source; live action observation blocked |
| EMP-FUNC-060 | Active direct reports, same-company scope, drilldown action, empty state | pass; 2 seeded active reports for `employee-demo-001`, zero for a leaf employee |
| EMP-PERM-060 | `employees.read` datasource/action boundary | pass; both chart projection and drilldown require `employees.read` |
| EMP-DATA-060 | Migration replay and file-backed restart | pass; lookup index is idempotent and chart remains queryable after reopen |
| EMP-UI-060 | Authenticated Odoo/Core3 desktop and mobile | blocked; Odoo tab `1770662590` was borrowed by BrowserSkill session `zqun` |

Focused test: `test/employees_org_chart.integration.test.ts` (3 tests, 15
assertions). The full audit is blocked by unrelated concurrent page-schema
errors, and the adjacent Work-tab test has a pre-existing expected-field
mismatch for `Work Location Type`. No aggregate Employees sign-off is claimed.

## EMP-DEPARTMENT-CHILDREN-001 execution (2026-09-22)

| Case ID | Scope | Result |
| --- | --- | --- |
| EMP-SRC-061 | Odoo `child_of` department action, action name, and kanban menu mapping | pass from local Odoo source; live action observation blocked |
| EMP-FUNC-061 | Selected department plus recursive descendants, search, active/archived filter, empty state, and child-detail navigation | pass; focused test covers recursive results, search empty, missing root, and transport error |
| EMP-PERM-061 | Page datasource and navigation action require `employees.read` | pass from YAML contract |
| EMP-DATA-061 | Parent relation migration replay, deterministic hierarchy, and file-backed restart | pass; focused test verifies replay and restart |
| EMP-UI-061 | Authenticated Odoo/Core3 desktop and mobile comparison | blocked; tab `1770662590` was already borrowed by BrowserSkill session `zfuv` |

Focused test: `test/employees_department_children.integration.test.ts` (3 tests,
20 assertions). Adjacent department regression set passes 10 tests / 89
assertions. UI audit and frontend/CSS build pass.
Evidence: `evidence/employees/2026-09-22/EMP-DEPARTMENT-CHILDREN-001/`.
No aggregate Employees sign-off is claimed.
