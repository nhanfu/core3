# manufacturing parity progress

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
