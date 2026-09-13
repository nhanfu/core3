# manufacturing parity progress

## 2026-09-13 retest — `MANUFACTURING-WORA-001` / `63b8d712`

- Authenticated `admin@tms.local` browser evidence now verifies the exact `/manufacturing/work-orders-analysis?fixture_state=transport_error` URL at `1440x900` and `390x844`. Both render the `Data unavailable` alert with message `Work Orders Analysis is temporarily unavailable.` and `503 MRP_WORKORDER_ANALYSIS_UNAVAILABLE`; both have zero page/request errors and no horizontal overflow. Capture paths and SHA-256 values are recorded in `qa/manufacturing.md`.
- Renderer regression passes 12/12; focused Work Orders Analysis passes 5 tests / 50 assertions; full Manufacturing passes 60 tests / 680 assertions across 19 files. Audit, global/manufacturing CSS builds, targeted ESLint, and diff check pass. Full sample ESLint still reports only the two pre-existing website optional-chaining errors at `test/website_public.integration.test.ts:31,33`.
- Existing paired Odoo graph/pivot/list/form evidence remains available in `plan/odoo-ui-parity/manufacturing.md`; no fresh Odoo probe was run. This retest verifies the repair only and makes no complete-module or aggregate-progress sign-off.

## 2026-09-13 bounded retest — `MANUFACTURING-WORA-001` / `499edd41`

- The exact authenticated desktop/mobile URL
  `/manufacturing/work-orders-analysis?fixture_state=transport_error` was
  exercised against the retest checkout. Both viewports reached the route with
  zero page/request errors and no overflow, but showed the declared empty
  state, not the declared 503 transport state. Captures and SHA-256 values are
  recorded in `qa/manufacturing.md`.
- The focused repair test passed: 5 tests / 50 assertions. It validates the
  public 503 datasource envelope, plus company and permission/error guards.
- The 19-file Manufacturing test glob stalled and was terminated after about
  50 seconds; it has no aggregate result. Audit and both requested CSS builds
  passed; diff check passed. ESLint remains blocked by two unrelated existing
  optional-chaining errors in `test/website_public.integration.test.ts:31,33`.
- Existing paired Odoo source captures remain available in the module plan;
  no fresh Odoo probe was run. This bounded retest makes no aggregate progress
  or sign-off claim.

Module owner: manufacturing module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: working tree after authenticated manufacturing QA

## Current state

The module has a current functional/browser QA candidate. No complete parity
claim is made here because paired Odoo visual adjudication and remaining CRUD
interaction coverage are still open.

## 2026-09-13 migration replay repair

- Repaired migration `0.0.6` so fixture cleanup is limited to its own six MOs,
  six work orders, four moves, and the two known legacy demo work orders plus
  `mo-demo-001`; existing Manufacturing rows are preserved on replay.
- Added `test/manufacturing_migrations.integration.test.ts` covering a full
  chain replay under a second migration ledger, existing-row preservation, and
  fixture singleton counts.
- Verified: Manufacturing `61 tests / 687 assertions`; audit `659/668/1,138`;
  global and Manufacturing CSS; targeted ESLint; and `git diff --check` all
  pass. Full lint still reports only the pre-existing website errors noted in
  the QA ledger.
- Candidate remains in-progress: this closes `MRP-FUNC-008`, but does not
  close paired Odoo, browser CRUD/actor, restart, or complete-module gates.

## Current evidence (2026-09-12)

- Manufacturing focused corpus: `bun test ./test/manufacturing*.integration.test.ts --timeout 20000` — 59 passed, 674 assertions, 0 failed across 19 files.
- Fresh authenticated module runner on port 4027 passed all 32 registered
  routes at desktop 1440x900 and mobile 390x844: 64/64 checks, valid seeded
  detail IDs, no page/request errors, and no horizontal overflow.
- Authenticated Admin work-order workflow passed for `wo-blocked-001`:
  Waiting → Ready → Progress (paused) → Ready → Blocked, with row versions
  1 → 6. A stale plan returned 409 `MRP_WORKORDER_INVALID_STATE`, and
  `fleet@tms.local` was denied the plan action with 403.
- Existing paired Manufacturing captures remain recorded in the module plan;
  this current candidate still needs a fresh Odoo/Core3 comparison pass for
  sign-off.

## Next bounded task

Complete the paired Odoo comparison and browser CRUD interaction checks for
the remaining Manufacturing surfaces, then dispatch/retest QA against the
committed candidate. Keep the migration consolidation decision separate from
released migration history.

## Merge review record — candidate `383583f6` / QA `112ed911`

- QA evidence was reviewed: the candidate contract suite, audit, CSS build,
  and diff check passed, while authenticated browser and paired Odoo gates
  remained open.
- The product candidate was rejected because the active checkout already has a
  different Work Orders Analysis API/page/test contract, producing product
  add/add conflicts. This QA record is historical and does not validate the
active implementation or grant Manufacturing sign-off.

## Coordinator reconciliation — Work Orders Analysis browser repair (2026-09-13)

- Reviewed owner lineage `cbd5d72f` -> `dcedc46b` -> `db7c31a8`. The active
  branch retained its established `mrp_workorder_analysis` graph/pivot/detail
  contracts; the incompatible replacement `mrp_workorders` model was not
  imported.
- Integrated the valid live Vite source bridge/loopback binding as active
  `1dc88184`. Active focused verification passed **5 tests / 50 assertions**;
  audit passed **661 pages / 670 routes / 1161 datasources**; frontend/CSS
  build, targeted ESLint, and diff-check passed.
- QA evidence for the bounded repair passed live PageField JavaScript,
  authenticated desktop/mobile rendering, company isolation/spoof protection,
  guard and migration checks, and **11 tests / 124 assertions**.
- Manufacturing remains conditional: restart durability, Temporal/integration,
  paired Odoo comparison, and repository-wide lint remain open or limited.
