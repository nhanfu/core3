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
