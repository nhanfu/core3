# fleet QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/fleet-desktop.png and fleet-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress

## 2026-09-22 — Vehicles Activity action mode

- Feature `FLEET-VEHICLE-ACTIVITY-001` adds the missing Activity mode from
  Odoo's `fleet_vehicle_action` (`kanban,list,form,pivot,activity`) to the
  existing Vehicles page/API seam.
- Durable vehicle activity storage, deterministic fixtures, schedule form,
  company/permission/date/type/stale guards, and migration replay are covered
  by `fleet_vehicle_activity_action.integration.test.ts`: **3 passed, 21
  assertions**.
- Fleet regression suite: **95 passed, 959 assertions** across 29 files;
  audit, Fleet Sass, frontend build, and diff-check passed.
- BrowserSkill connected to `245ea108`, but borrowing the existing signed-in
  Odoo tab `1770662590` timed out awaiting confirmation. The exact blank Agent
  Window capture is in
  `evidence/fleet/2026-09-22/fleet-vehicle-activity-action-20260922/`.
  No authenticated Odoo or Core3 desktop/mobile parity claim is made.

Disposition: **functionally accepted / visual gate blocked**. Do not treat
this bounded slice as full Fleet sign-off.

## 2026-09-22 — Mail to Driver bounded slice

- `fleet_vehicle_mail.integration.test.ts`: **3 passed, 27 assertions, 0
  failures**. Source mapping, page/API join, durable selected-driver sends,
  template creation, file-backed restart, and 400/403/404/409/422 guards pass.
- Live Odoo browser instance `245ea108`, database `core3_reference`: Fleet is
  absent from the authenticated app launcher and direct `/odoo/fleet` returns
  to Discuss. Desktop and 390x844 blocker captures are recorded in the feature
  evidence directory; no Fleet visual parity is claimed.
- Core3 authenticated desktop/mobile interaction and paired comparison remain
  open because the live reference has no Fleet screen and the separate Core3
  QA sign-in was not part of this bounded verification.

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

## QA-pending candidate confirmation `1e55ca16` (2026-09-13)

- Existing owner/worktree remains `agent/fleet-next-wave` at
  `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`; candidate is not
  merged and awaits existing Fleet QA.
- Focused **3/64**, full Fleet **69/718**, audit **659/669/1,134**;
  ESLint/Sass/frontend builds and diff-check pass.
- Browser CRUD, restart durability, paired Odoo, and broader Fleet scope remain
  open.

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

## QA disposition and same-owner repair routing for `1e55ca16` (2026-09-13)

- The existing Fleet QA event is deactivated with **DEFECTS / BLOCKED**. Do
  not merge or promote `1e55ca16`.
- Critical repair routed back to the same owner/worktree
  `agent/fleet-next-wave` at
  `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`: replace or correctly
  bind service list/detail/vehicle-selector predicates using `current_company_name`
  on live page/query requests, then rerun the Demo → Vietnam service/detail/
  selector isolation sequence and focused tests.
- Preserved blockers: Fleet User lacks a usable Fleet-read fixture; in-memory
  runner restart durability is unverified; paired authenticated Odoo comparison
  is unavailable. The QA ledger and handoff docs in that worktree are dirty
  QA state and must be inherited, not overwritten.
- Required next event after a self-contained repair commit: existing
  `QA-FLEET-WAVE-20260913-R2` retest. Dispatch cannot be executed in this
session because no agent lifecycle handle is available; no replacement owner
or duplicate QA was created.

## QA retest `7f00561a`: persistent runtime isolation defect (2026-09-13)

- Retest evidence: startup/API **200**; focused service suite **3 tests / 67
  assertions**; full Fleet **69 tests / 721 assertions across 23 files**; audit
  **659 pages / 669 routes / 1,134 datasources**; Fleet CSS/frontend builds,
  targeted ESLint, and diff-check pass. Desktop/mobile rendering, CRUD/workflow,
  guards, same-process reload, and Fleet User read-only (read 200/create 403)
  passed.
- Critical failure persists in the authenticated runtime: Demo → Vietnam still
  exposes all six Demo services; Demo detail `fleet-service-001` remains
  accessible; and vehicle selectors expose two Demo vehicles. Do not merge
  `1e55ca16` or promote `7f00561a`.
- Same-owner root-cause task routed to `agent/fleet-next-wave` in
  `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`: trace the actual
  client request/session context, API params, datasource binding, cache, and
  detail authorization end to end. Do not make another speculative
  predicate-only edit. Require a self-contained repair plus focused live
  Demo/Vietnam proof before reactivating QA.
- Fleet User fixture/read coverage, process-restart durability, and paired Odoo
  remain open. QA is deactivated pending the repair; dispatch cannot be
  performed in this session because no agent lifecycle handle is available.

## Reviewer reconciliation `dbcd2430`: blocked; QA PASS not reproducible (2026-09-13)

- Ownership and lineage were valid in the existing `agent/fleet-next-wave`
  worktree at `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`, after
  the prior Fleet service-boundary repairs. The candidate added request-context
  propagation and one Fleet isolation regression test; no unrelated product
  files were present in the owner worktree.
- A clean cherry-pick was temporarily made as `8372b826`, but post-integration
  focused verification failed: **3 passed / 1 failed, 62 assertions** in
  `test/fleet_services.integration.test.ts`. After switching the authenticated
  user to Vietnam, `fleet_services` still returned all six Demo rows. The three
  legacy CRUD/workflow/guard checks passed.
- Root cause is concrete: `services/fleet/api/services.yaml` does not apply
  either `:company_name` or `:current_company_name` to the service-list query,
  and the vehicle selector query is likewise unscoped. Propagating context alone
  cannot enforce the claimed isolation. The temporary integration was reverted
  as `2b95d27d`; `dbcd2430` is **not integrated**.
- The linked QA report's Demo → Vietnam → Demo `6/2 → 0/0 → 6/2`, detail-denial,
  selector, CRUD, actor, responsive, same-process persistence, audit/build/lint
  evidence is preserved as an unconfirmed report, not accepted as active-branch
  evidence. Required next action is a same-owner repair covering the actual
  service list, selector, detail query/authorization, and client/session request
  binding, followed by focused runtime proof.
- Process restart on duckdb-memory remains unverified and fresh paired
  authenticated Odoo comparison remains unavailable. Fleet remains
  **conditional/blocked**, with no full module sign-off.

## Reviewer reconciliation `d7c50906`: conditional bounded PASS (2026-09-13)

- The existing Fleet owner/worktree was valid:
  `agent/fleet-next-wave` at
  `/home/nhanjs/projects/core3-worktrees/fleet-next-wave`. The candidate was
  self-contained for the Fleet service company-boundary slice. Its diff adds
  `authenticatedCompanyName`, identity-derived context for query and prefetch
  requests, service-list/detail/selector predicates, and service mutation
  company guards. The owner worktree contained only QA/handoff ledger edits
  outside the candidate.
- Cherry-pick required conflict resolution against the active branch's older
  Fleet service slice, but completed cleanly as `fc560bde`; only the candidate's
  shared auth helper/routing and Fleet service files were retained. No
  unrelated module or aggregate files were staged.
- Post-integration focused verification passed **5 tests / 83 assertions**;
  `bun run audit` passed with **661 pages / 670 routes / 1,154 datasources**;
  commit diff-check passed. The linked QA evidence additionally reports the
  Fleet suite **70 passed**, startup, build/lint, and no-error desktop/mobile
  browser runs.
- Authenticated evidence passed Demo → Vietnam → Demo isolation **6/2 → 0/0
  → 6/2**, Demo detail denial, scoped prefetch/detail/selectors, ignored
  non-admin query widening, CRUD/workflow/guards, Fleet User read **200** and
  create **403**, same-process persistence/cleanup, and no failed browser
  requests.
- Disposition: **conditional bounded PASS; integrated**. DuckDB-memory process
  restart durability remains unverified, and fresh paired authenticated Odoo
  comparison remains unavailable. Fleet is not fully signed off; broader Fleet
  parity gates remain open.

## 2026-09-20 — Odometer Logs CRUD bounded slice

- Source trace: Odoo `fleet.vehicle.odometer` requires `vehicle_id`, exposes
  `value` and `date` in the form, derives the related `unit`, and registers the
  `list,form,graph` action with an editable list.
- Implementation: Core3 page YAML is presentation-only; `api/odometers.yaml`
  owns create, and `api/fleet-odometer-detail.yaml` owns edit/delete. Writes
  require `fleet.write`, use the existing durable odometer table/fixtures,
  require row versions for edit/delete, and reject archived/missing vehicles
  and invalid date/value input before insert/update.
- Evidence: `bun test test/fleet_odometers.integration.test.ts --timeout
  20000` passed **7 tests / 59 assertions**. The CRUD test closed and reopened
  a file-backed DuckDB database, replayed migrations, verified the created log,
  edited it, rejected a stale write, and deleted it. `bun test
  test/fleet*.integration.test.ts --timeout 20000` passed **73 tests / 764
  assertions** across 22 Fleet files. `bun run audit` passed at **665 pages /
  674 routes / 1,177 datasources**; `git diff --check` passed.
- Browser/Odoo paired captures were not run for this candidate; Fleet remains
  conditionally accepted rather than fully signed off.

## 2026-09-21 — Contract Logs CRUD bounded slice

- Candidate: current checkout Fleet contract API/page changes plus migration
  `20260921100000-036-fleet-contract-crud.yaml`.
- Focused `bun test test/fleet_contracts.integration.test.ts --timeout 20000`:
  **6 passed / 69 assertions**. Full Fleet corpus:
  **75 passed / 791 assertions** across 22 files.
- File-backed DuckDB reload and migration replay passed for generated-ID create,
  edit, stale rejection, archive/restore, cancellation guard, and delete.
- `bun run css:build:fleet`, `bun run audit` (**772 pages / 781 routes /
  1,582 datasources**), and `git diff --check` passed. The earlier CRM
  discovery issue is resolved by the now-present CRM API fragments; CRM paths
  were not staged.
- Odoo browser blocker: authenticated instance `245ea108` has no Fleet app/menu;
  direct `/odoo/fleet` falls back to Discuss. Core3 browser blocker: the
  frontend reached `/vehicles`, then `/api/modules` returned 502 and the host
  hit `EMFILE` descriptor exhaustion. Captures and omitted-artifact reasons are
  in the linked feature evidence.

QA state: **conditional bounded functional pass; visual/Odoo gates blocked**.
Fleet remains unsigned-off.

## 2026-09-22 — Model Vehicles stat action

- Feature `FLEET-MODEL-VEHICLES-001` repairs the existing model detail
  `Vehicles` stat action. It now passes the stable model ID and scopes the
  Vehicles datasource through durable Fleet model relations.
- Focused test: `bun test
  test/fleet_model_vehicles_action.integration.test.ts` — **2 passed / 18
  assertions**. Targeted Models/Vehicles regression: **6 passed / 76
  assertions**.
- Coverage includes local Odoo action mapping, page/API separation, read
  permission, idempotent relation migration, selected-model filtering,
  wrong-company isolation, unknown/empty results, and transport error.
- BrowserSkill blocker: instance `245ea108` listed signed-in Odoo tab
  `1770662590`, but borrow failed because it was already borrowed by session
  `cqvt`. Desktop and mobile Agent Window blocker captures plus the exact error
  are under
  `evidence/fleet/2026-09-22/fleet-model-vehicles-action-20260922/`.
  No authenticated Odoo/Core3 visual parity claim is made.

QA state: **conditional bounded functional pass; live visual gate blocked**.
Fleet remains unsigned-off.

## 2026-09-22 — Vehicle chatter attachments bounded slice

- Feature `fleet-vehicle-attachments-20260922` adds the Odoo vehicle-form
  chatter attachment datasource, authenticated download rule, and durable
  upload/remove actions to the existing `vehicle-detail` page/API pair.
- Focused `bun test test/fleet_vehicle_attachments.integration.test.ts
  --timeout 30000`: **3 passed / 27 assertions**. Full Fleet corpus:
  **84 passed / 876 assertions** across 25 files.
- File-backed DuckDB reload and migration replay retain attachment metadata;
  invalid file, duplicate, missing/wrong-company vehicle, actor, and stale
  row guards reject without partial writes.
- `bun run css:build:fleet`, `bun run audit` (**802 / 811 / 1,656**), and
  `git diff --check` pass.
- Authenticated Core3 browser verification succeeded on port 4323 at desktop
  1916x833 and mobile 390x844. Captures are in the feature evidence folder;
  the seeded attachment panel rendered with Add, Download, and Remove.
- Browser upload itself was not claimed: `bsk upload` returned the exact
  extension file-URL permission blocker `Not allowed`. API/persistence upload
  proof remains complete.
- Odoo instance `245ea108` / `core3_reference` still has no Fleet menu;
  desktop/mobile captures are blocker evidence only, not visual parity.

QA state: **conditional bounded functional/UI pass; paired Odoo and browser
file-upload gates blocked**. Fleet remains unsigned-off.

## 2026-09-22 — Vehicle tag assignment bounded slice

- Feature `fleet-vehicle-tags-20260922` adds durable vehicle/tag many-to-many
  assignment to the existing vehicle detail page/API seam.
- Focused test: **4 passed / 27 assertions**. Affected set covering the new
  slice and the three preceding Fleet workflows: **13 passed / 112 assertions**.
- Audit **807 / 816 / 1,671**, Fleet Sass, targeted ESLint, and diff-check pass.
- Odoo blocker: authenticated BrowserSkill instance `245ea108` on
  `core3_reference` has no Fleet menu; `/odoo/fleet` falls back to
  Discuss/OdooBot. Desktop/mobile blocker captures are linked from the feature
  evidence folder.
- Core3 browser blocker: no authenticated Core3 runtime/tab was available in
  this turn, so no desktop/mobile visual claim is made.

QA state: **conditional bounded functional pass; Odoo/Core3 visual gates
blocked**. Fleet remains unsigned-off.

## 2026-09-22 — Contract renewal activities bounded slice

- Feature `fleet-contract-renewal-activities-20260922` adds durable
  `Contract to Renew` schedule/complete activity actions to the contract
  detail page/API seam.
- Focused test: **3 passed / 31 assertions**. Affected Fleet set: **21 / 242**;
  complete Fleet corpus: **78 / 822** across 23 files.
- Coverage includes page/API separation, source mapping, deterministic seed,
  empty/transport states, actor/company/row-version guards, schedule → Done,
  and file-backed restart/migration replay.
- Static gates pass: audit **782 / 791 / 1,606**, Fleet Sass, and diff-check.
- Odoo blocker: authenticated instance `245ea108` on `core3_reference` has no
  Fleet app/menu; desktop/mobile blocker captures are linked from the feature
  evidence folder.
- Core3 blocker: port 4322 reached protected sign-in, but authorized
  human-help login did not complete. No authenticated browser workflow or
  visual parity pass is claimed.

QA state: **conditional bounded functional pass; visual/Odoo gates blocked**.
Fleet remains unsigned-off.

## 2026-09-22 — Manufacturer Models stat action

- Feature `fleet-manufacturer-models-action-20260922` replaces the existing
  placeholder event on the manufacturer detail `Models` stat with the Odoo
  `action_brand_model` navigation contract. The existing Models page/API pair
  now accepts `brand_id`, presents the Manufacturer filter, and returns only
  models for the selected manufacturer.
- Focused test: `bun test
  test/fleet_manufacturer_models_action.integration.test.ts` — **2 passed / 17
  assertions**. It verifies the local Odoo source mapping, page/API joins,
  permissioned route params, migration replay, and Ford/Nissan scoped rows.
- No schema/data migration was needed: this action reuses the durable Fleet
  manufacturer/model tables and adds only a read filter/navigation contract.
- Browser evidence is blocked honestly. BrowserSkill instance `245ea108` was
  connected, but the required borrow of the existing signed-in Odoo tab timed
  out awaiting browser confirmation. The desktop/mobile Agent Window captures
  and exact details are in
  `odoo-ui-parity/evidence/fleet/2026-09-22/fleet-manufacturer-models-action-20260922/`;
  they are blocker artifacts, not parity captures. The borrowed-tab session was
  stopped and no credentials or independent login were used.

QA state: **conditional bounded functional pass; live Odoo/Core3 visual gates
blocked**. Fleet remains unsigned-off.

## 2026-09-22 — Vehicle clickable statusbar bounded action

- Feature `fleet-vehicle-statusbar-20260922` binds the Odoo vehicle form's
  clickable `state_id` statusbar to four durable Core3 status mutations on the
  existing `vehicle-detail` page/API pair.
- Focused test: `bun test
  test/fleet_vehicle_statusbar.integration.test.ts` — **2 passed / 17
  assertions**. It verifies the local Odoo source mapping, page/API join, all
  four stage actions, persistence, row-version, invalid-status, and company
  guards.
- No migration was required; the existing vehicle/status tables are reused.
- BrowserSkill blocker: session `gguk` on browser instance `245ea108` could
  list the signed-in Odoo tab but `bsk tab borrow 1770662590 --timeout 120s`
  timed out awaiting the required browser confirmation. The exact
  contemporaneous desktop/mobile blocker captures are linked from the feature
  evidence folder; no live Odoo or Core3 visual parity claim is made.

QA state: **conditional bounded functional pass; visual/Odoo gates blocked**.
Fleet remains unsigned-off.
