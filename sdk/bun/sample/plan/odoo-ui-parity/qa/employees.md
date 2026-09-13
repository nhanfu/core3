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
