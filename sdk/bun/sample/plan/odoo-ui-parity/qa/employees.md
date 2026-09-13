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
