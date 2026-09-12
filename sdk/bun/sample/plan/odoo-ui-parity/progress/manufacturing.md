# manufacturing parity progress

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
