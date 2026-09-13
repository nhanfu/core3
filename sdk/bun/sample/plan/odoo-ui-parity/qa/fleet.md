# fleet QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/fleet-desktop.png and fleet-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress

## Wave QA fallback (2026-09-13)

- `fleet_vehicle_create.integration.test.ts`: **2 passed, 10 assertions,
  0 failures** after candidate `160a7de5`.
- Valid vehicle persistence/defaults and required/duplicate validation passed.
- Browser create/edit, actor/company, restart, integration, and paired Odoo
  gates remain open; this is not module sign-off.
QA slot: dispatchable fleet assignment (pending wave dispatch)
Module owner: fleet module owner
Verification trigger: feature-complete
Candidate commit: working tree after vehicle create contract slice

Detailed execution matrix: [`test-plans/fleet.md`](test-plans/fleet.md). It is the module-level source for the remaining CRUD, actor, persistence, Temporal, and paired Odoo gates.

## QA-3 candidate verification (2026-09-13)

- Candidate under test: `cae76032` (`feat: harden fleet vehicle creation contract`).
- Functional corpus: `bun test ./test/fleet_vehicle_create.integration.test.ts ./test/fleet_vehicle_archive.integration.test.ts ./test/fleet_driver_change.integration.test.ts ./test/fleet_settings.integration.test.ts --timeout 20000` — **11 passed, 73 assertions, 0 failures** across 4 files.
- Vehicle create persistence: Administrator created `QA Fleet Shuttle` in an isolated DuckDB database; the reload query returned the same ID, plate, and contract date. Required/type/odometer/date/duplicate guards returned the declared 422/409 errors without inserting rows.
- Vehicle lifecycle/permission coverage: archive → restore passed with row versions `1 → 3`; stale archive was rejected; driver assignment and Fleet settings validation/persistence passed.
- Authenticated browser create: Administrator created `QA Browser Fleet 20260913` from the mobile form (`390x844`), `/api/mutate` returned `200`, the row appeared in the list, and it remained after reload. No console errors, page errors, failed requests, or horizontal overflow were observed. Capture: `/tmp/core3-odoo-parity/fleet-qa-create-mobile-saved.png`.
- Authenticated browser route/render: Administrator Vehicles rendered at desktop `1440x900` without errors or overflow. Capture: `/tmp/core3-odoo-parity/fleet-qa-desktop.png`.
- Fleet-user boundary: `fleet@tms.local` had no `New vehicle` control; an authenticated direct `fleet.vehicles.create` request returned `403` with `Requires permission: fleet.write`. The same account was denied Fleet route access with `403 Requires permission: fleet.read`, so the expected Fleet User read/action case cannot pass with the current demo permissions.
- Persistence boundary: browser reload and isolated database reload passed. Restart/migration persistence was not claimed because this runner used `--memory`; it remains open for a file-backed DuckDB run.

QA state: qa-in-progress

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| FLEET-QA3-001 | Candidate vehicle create validation, persistence, lifecycle, settings, and driver assignment | 11 tests / 73 assertions; isolated DuckDB and reload evidence | PASS |
| FLEET-QA3-002 | Administrator authenticated mobile create and reload | `/tmp/core3-odoo-parity/fleet-qa-create-mobile-saved.png`; HTTP 200; no errors/overflow | PASS |
| FLEET-QA3-003 | Fleet-user create/read boundary | UI action absent; authenticated create returned 403 `fleet.write`; Fleet route returned 403 `fleet.read` | FINDING |
| FLEET-QA3-004 | File-backed restart/migration persistence | Not exercised by the memory runner | PENDING |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| FLEET-001 | Focused Fleet contract corpus | 62 focused tests / 683 assertions across 20 files | PASS |
| FLEET-002 | Registered route responsive smoke | Corrected 28-route matrix reached 55/56 on the first pass; the only miss was a mobile `/fleet/config/tags` early-shell sample. An isolated rerun after the normal render wait produced the full tag table with no errors, failed requests, or overflow | PASS |
| FLEET-003 | Vehicle archive/restore persistence | `fleet-demo-002` archive → restore, row versions 1 → 3; stale archive 409 | PASS |
| FLEET-004 | Permission boundary | Fleet user archive returned 403 `fleet.write` | PASS |
| FLEET-005 | Fresh paired Odoo visual comparison and complete browser CRUD | Not complete for current candidate | pending |
| FLEET-006 | Vehicle create validation and persistence | 2 focused tests / 10 assertions; valid create reloaded with database defaults; required/type/odometer/date/duplicate guards returned explicit 422/409 errors without inserting rows; full Fleet corpus 64/693 across 21 files | PASS for declarative API contract; authenticated browser create and restart persistence remain pending |
| FLEET-QA3-001 | Current candidate focused create/permission/persistence verification | 11 tests / 73 assertions; Administrator browser create/reload passed; Fleet account lacked `fleet.read` and `fleet.write` in the demo permission set | PASS for tested candidate; permission fixture and restart gates remain open |
| FLEET-QA3-002 | Fleet User expected read/action access | `fleet@tms.local` received 403 for Fleet route and `fleet.vehicles.create`; no New vehicle control rendered | OPEN — demo actor does not satisfy the plan's Fleet User expectation |

## Sign-off

- Functional: pass for tested Fleet contracts and vehicle workflow
- Current-wave vehicle create contract: pass; browser mutation and restart
  evidence remain open
- Permissions: pass for Administrator/Fleet-user write boundary; Fleet User read/action expectation is open because the demo actor lacks Fleet permissions
- Persistence/data integrity: pass for isolated create reload and archive/restore workflow; file-backed restart remains open
- Desktop/mobile visual parity: route smoke pass; paired parity pending
- Tester decision: candidate create and browser smoke pass; permission-fixture, restart, paired Odoo, and complete interaction gates remain open

## Conditional review handoff — candidate `e1a61d00` (2026-09-13)

- Vehicle edit persistence/validation/duplicates/stale-save API, auth guards,
  UI audit, Fleet Sass/frontend build, and `git diff --check` passed.
- Blocker `QA-FLEET-SUITE-001`: the full Fleet suite has a 5-second
  `fleet_service_types` timeout; no full-suite pass is claimed.
- Blocker `QA-FLEET-BROWSER-001`: authenticated candidate browser and restart
  verification were not executable; no candidate desktop/mobile mutation or
  file-backed restart evidence is claimed.
- Blocker `QA-FLEET-ODOO-001`: fresh authenticated Odoo comparison was not
  executable. Full ESLint also remains blocked by unrelated Website errors.

Disposition: retain as **conditional only**; do not integrate or sign off the
Fleet module while these blockers remain.

## Reviewer disposition — candidate `04b6f208`

- Integrated on the active branch as `4aaa428f`; scope is limited to exposing
  persisted `acquisition_date` and `trailer_hook` fields in the Fleet vehicle
  create form and its regression assertion.
- Post-merge verification passed: 3 candidate tests / 12 assertions, Fleet UI
  audit (661 pages / 670 routes / 1153 datasources), targeted ESLint, Fleet
  Sass build, and `git diff --check`.
- Preserved blockers: restart durability was not certified by the in-memory
  runner; browser/Odoo evidence, wrong-company isolation, and other runtime
  gates remain open. Fleet remains conditional and unsigned-off.

## 2026-09-13 coordinator review: candidate `f9a8f127`

- Integrated the bounded Fleet vehicle company-scope migration/API/create and
  isolation repair as `b34b3b9f`. One expected detail-file conflict was
  resolved by retaining the active Fleet actions together with the candidate
  scope/edit contract; no unrelated files were imported.
- Post-merge candidate tests passed: **5 tests, 19 assertions**. Candidate
  corpus evidence remains **69 tests, 710 assertions**; migration replay,
  file-backed restart, foreign-company isolation, permissions, audit (**661
  pages, 670 routes, 1154 datasources**), Sass, build, ESLint, and diff-check
  passed.
- Fleet remains **conditional / unsigned-off**. Authenticated browser CRUD,
  desktop/mobile visual/Odoo comparison, and broader Fleet scoping remain
  blocked or pending.
## 2026-09-13 coordinator dispatch — bounded service lifecycle wave

- Existing owner `agent/fleet-next-wave` is assigned on
  `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`, based at `f9a8f127`.
  Development event: `DEV-FLEET-WAVE-20260913-R2`; QA event:
  `QA-FLEET-WAVE-20260913-R2`; handoff commit: `e3d14960`.
- Scope is vehicle-service create/edit/complete persistence with cost/date/state
  and vehicle relation, validation, company/permission, duplicate/stale, and
  atomic no-partial-write tests. Candidate pending; existing ledger and
  aggregate progress are preserved.
## DEV/QA reconciliation — `DEV-FLEET-WAVE-20260913-R2` / `QA-FLEET-WAVE-20260913-R2`

- The owner handoff `e3d14960` requested vehicle-service work, but authoritative
  main already contains the implementation and parity history, including
  `869774ed` (`feat(fleet): add services logs parity slice`) and the later
  service-form repair `b008bff1`. No duplicate owner product patch is required.
- QA event triggered/reconciled against the existing implementation. Active
  checkout command `bun test test/fleet_services.integration.test.ts` passed
  **3 tests / 56 assertions**, covering CRUD, relation and validation,
  lifecycle workflow, archive/delete, and stale guards.
- Disposition: **bounded QA pass; conditionally accepted**. Broader Fleet
  blockers remain preserved: authenticated Core3 CRUD/browser evidence, paired
  Odoo comparison, broader company scoping across services/odometers/contracts
and reports, and process-restart/runtime gates. Fleet is not fully signed off.

## R2 candidate ready for QA: service company boundaries `1e55ca16` (2026-09-13)

- Existing owner/worktree: `agent/fleet-next-wave` at
  `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`. The self-contained
  three-file product commit scopes service lists/details/selectors/mutations by
  company and adds duplicate active-log protection plus cross-company,
  invalid, duplicate, stale, and atomicity tests.
- Candidate evidence: focused **3 tests / 64 assertions**; Fleet **69 tests /
  718 assertions**; audit **659 pages / 669 routes / 1,134 datasources**;
  ESLint, Sass/frontend builds, and diff-check pass. Candidate is ready for
  the existing `QA-FLEET-WAVE-20260913-R2` event; it is not integrated before
  module QA.
- Browser, Odoo, and restart gates remain open. No full Fleet sign-off.
