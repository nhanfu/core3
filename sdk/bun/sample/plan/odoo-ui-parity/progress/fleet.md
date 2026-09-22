# fleet parity progress

Module owner: fleet module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: working tree after vehicle create contract slice

## Current state

## Current wave: Vehicle chatter `FLEET-VEHICLE-CHATTER-001` (2026-09-22)

- Added durable vehicle detail messages/notes and combined them with vehicle
  activities in the Odoo-style chatter stream.
- Focused: **4 passed / 23 assertions** in
  `fleet_vehicle_chatter.integration.test.ts`, including migration replay,
  restart persistence, actor/company/content/stale guards, and page/API seam.
- Evidence: `odoo-ui-parity/evidence/fleet/2026-09-22/fleet-vehicle-chatter-20260922/`.
- Browser blocker: borrowing authenticated Odoo tab `1770662590` on instance
  `245ea108` timed out awaiting confirmation; blank desktop/mobile Agent Window
  captures only, no visual parity claim.

This is a bounded feature result, not Fleet module completion or sign-off.

## Current wave: Vehicles Activity action mode `FLEET-VEHICLE-ACTIVITY-001` (2026-09-22)

- Added the missing Odoo `fleet_vehicle_action` Activity mode to the existing
  Vehicles page, with durable `fleet_vehicle_activities` schema/fixtures and a
  permissioned schedule mutation.
- Focused: **3 passed / 21 assertions**; Fleet regression: **95 passed / 959
  assertions** across 29 files.
- Audit: **834 pages / 842 routes / 1,739 datasources**; Fleet Sass,
  frontend build, and diff-check pass.
- Evidence:
  `odoo-ui-parity/evidence/fleet/2026-09-22/fleet-vehicle-activity-action-20260922/`.
- Browser blocker: BrowserSkill borrow of authenticated Odoo tab
  `1770662590` on shared instance `245ea108` timed out; only a blank Agent
  Window was capturable. No authenticated desktop/mobile visual claim is made.

This is a bounded feature result, not Fleet module completion or sign-off.

## QA-pending candidate `1e55ca16` (2026-09-13)

Service company-scope candidate is queued for the existing Fleet QA owner; no
merge was performed. Focused **3/64**, full **69/718**, audit **659/669/1,134**,
ESLint/Sass/frontend builds, and diff-check pass. Browser CRUD, restart,
paired Odoo, and broader Fleet scope remain open.

The module has a current functional/browser QA candidate. No complete parity
claim is made because fresh paired Odoo adjudication and remaining interaction
coverage are still open.

## Current evidence (2026-09-12)

- Fleet focused corpus: `bun test ./test/*fleet*.integration.test.ts --timeout 20000` — 62 passed, 683 assertions, 0 failed across 20 files.
- Fresh authenticated runner on port 4030 checked all 28 registered routes at
  desktop/mobile. The corrected matrix accepted 55/56 on its first pass; the
  only miss was `/fleet/config/tags` sampled during its initial two-character
  shell. An isolated rerun after the normal render wait produced the full tag
  table with no page/request errors or horizontal overflow. The earlier three
  compact/invalid-detail cases were also rerun with corrected IDs and passed.
- Authenticated Fleet archive workflow passed for `fleet-demo-002`: archive
  then restore persisted `archived` and row versions 1 → 3; stale archive
  returned 409 `STALE_RECORD`; Fleet user archive returned 403
  `fleet.write`.

## Current-wave developer evidence (2026-09-13)

- Vehicle creation now declares stable guards for required name/license plate,
  Car/Bike type, non-negative odometer, valid acquisition/contract dates, and
  case-insensitive duplicate name/license plate checks in
  `services/fleet/api/vehicles.yaml`.
- `bun test ./test/fleet_vehicle_create.integration.test.ts --timeout 20000` —
  2 passed, 10 assertions, 0 failures. A valid vehicle reloaded with database
  defaults; seven invalid/duplicate requests returned explicit 422/409
  errors and did not insert rows.
- Full Fleet corpus
  `bun test ./test/fleet*.integration.test.ts --timeout 20000` — 64 passed,
  693 assertions, 0 failures across 21 files.

## QA-3 candidate verification (2026-09-13)

- Candidate `cae76032` bounded corpus:
  `bun test ./test/fleet_vehicle_create.integration.test.ts ./test/fleet_vehicle_archive.integration.test.ts ./test/fleet_driver_change.integration.test.ts ./test/fleet_settings.integration.test.ts --timeout 20000` — 11 passed, 73 assertions, 0 failures across 4 files.
- Administrator browser create on isolated runner `http://localhost:4336/fleet/vehicles` passed at mobile `390x844`: `QA Browser Fleet 20260913` / `QA-BROWSER-0913` was submitted through the form with HTTP 200 and remained after reload. No console/page/request errors or horizontal overflow. Capture: `/tmp/core3-odoo-parity/fleet-qa-create-mobile-saved.png`.
- Administrator desktop Vehicles render passed at `1440x900` with no errors or overflow. Capture: `/tmp/core3-odoo-parity/fleet-qa-desktop.png`.
- `fleet@tms.local` rendered without the New vehicle action; its authenticated `fleet.vehicles.create` request returned 403 `Requires permission: fleet.write`, and Fleet route access returned 403 `Requires permission: fleet.read`. This is recorded as an open actor-fixture finding because the QA plan expects a Fleet User read/action boundary.
- Browser reload and isolated DuckDB reload passed. File-backed restart/migration was not run because the QA runner used `--memory`.

## Next bounded task

Complete fresh paired Odoo comparison, authenticated vehicle edit CRUD,
Fleet User permission fixture/read boundary, company boundaries,
file-backed restart/migration proof, and browser workflow coverage before
sign-off.

## R2 candidate handoff: service company boundaries `1e55ca16` (2026-09-13)

Existing Fleet owner `agent/fleet-next-wave` has a self-contained candidate at
`/home/nhanjs/projects/core3-worktrees/fleet-next-wave`. Focused QA is **3/64**,
Fleet corpus **69/718**, audit **659/669/1,134**, and ESLint/Sass/frontend
build/diff-check pass. Ready for the existing module QA event; browser, Odoo,
and restart gates remain open.

## QA disposition: `1e55ca16` blocked, same-owner repair required (2026-09-13)

Fleet QA deactivated with **DEFECTS / BLOCKED**. Do not merge `1e55ca16`.
Route the repair to existing owner `agent/fleet-next-wave` in
`/home/nhanjs/projects/core3-worktrees/fleet-next-wave`: bind service
list/detail/selector predicates to live `current_company_name`, then retest
the Demo/Vietnam switch sequence. Fleet User fixture, process restart, and
paired Odoo remain open. QA retest dispatch is pending unavailable agent
lifecycle capacity; no replacement was created.

## QA retest `7f00561a`: blocked, root-cause repair routed (2026-09-13)

Startup, CRUD/workflow, guards, Fleet User read 200/create 403, responsive
desktop/mobile, and same-process reload passed. Evidence: focused **3/67**,
full Fleet **69/721**, audit **659/669/1,134**, CSS/frontend/ESLint/diff-check
pass. Critical live defect remains: Vietnam sees all six Demo services, Demo
detail remains accessible, and selectors expose two Demo vehicles. Route a
client/session/API-param/datasource/cache/detail-authorization trace to the
same owner/worktree; no speculative predicate-only edit. Restart and Odoo
remain open, and QA retest dispatch awaits an available lifecycle handle.

## Reviewer reconciliation `dbcd2430` (2026-09-13)

The reported QA PASS is not reproducible on the active branch. The candidate
was temporarily cherry-picked as `8372b826`; its new isolation regression
failed because the Fleet service list and vehicle selector queries do not use
the propagated company context, and Demo rows remained visible after switching
to Vietnam. The temporary integration was reverted as `2b95d27d`; no Fleet
product merge is accepted. Route a same-owner root-cause repair for the live
service list/selector/detail authorization and request/session binding, then
re-run focused runtime isolation QA. Preserve open duckdb-memory restart and
paired authenticated Odoo gates.

## Reviewer reconciliation `d7c50906` (2026-09-13)

Integrated as `fc560bde` after resolving only active-branch conflicts in the
Fleet service slice. The merged diff contains identity-derived switched-company
context plus service list/detail/selector predicates and mutation guards.
Post-merge focused verification passed **5/83 assertions** and audit passed
**661/670/1,154**; linked QA reports full Fleet **70 passed**, startup,
build/lint, responsive browser, CRUD, permission, widening, and same-process
persistence evidence. Fleet is conditionally accepted for this bounded slice.
Process restart on duckdb-memory and fresh paired authenticated Odoo comparison
remain open; no full Fleet sign-off is claimed.

## Current wave: contract renewal activities `fleet-contract-renewal-activities-20260922`

- Implemented the next source-backed gap after Contract Logs CRUD: durable
  `Contract to Renew` activity schedule/complete lifecycle on contract detail.
- Focused: 3 passed / 31 assertions; affected Fleet set 21 / 242; complete
  Fleet corpus 78 / 822 across 23 files.
- Static: audit 782 pages / 791 routes / 1,606 datasources; Fleet Sass and
  diff-check pass.
- Evidence:
  `odoo-ui-parity/evidence/fleet/2026-09-22/fleet-contract-renewal-activities-20260922/`.
- Browser blockers: authenticated `core3_reference` Odoo instance `245ea108`
  has no Fleet app/menu; isolated Core3 port 4322 reached protected login but
  the authorized human-help login did not complete. No visual parity claim is
  made; Fleet remains conditionally accepted, not signed off.

## Current wave: model Vehicles stat action `FLEET-MODEL-VEHICLES-001` (2026-09-22)

- Repaired the existing Odoo `action_model_vehicle` navigation so the selected
  model ID scopes the Vehicles list through durable Fleet relation storage.
- Focused: **2 passed / 18 assertions**; targeted Models/Vehicles regression:
  **6 passed / 76 assertions**.
- Evidence:
  `odoo-ui-parity/evidence/fleet/2026-09-22/fleet-model-vehicles-action-20260922/`.
- Browser blocker: signed-in Odoo tab `1770662590` on instance `245ea108` was
  already borrowed by session `cqvt`; exact blocker and desktop/mobile Agent
  Window captures are recorded. No visual parity claim is made.

This is a bounded feature result, not Fleet module completion or sign-off.
