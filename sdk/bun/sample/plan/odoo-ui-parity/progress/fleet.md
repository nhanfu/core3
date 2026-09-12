# fleet parity progress

Module owner: fleet module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: working tree after authenticated Fleet QA

## Current state

The module has a current functional/browser QA candidate. No complete parity
claim is made because fresh paired Odoo adjudication and remaining interaction
coverage are still open.

## Current evidence (2026-09-12)

- Fleet focused corpus: `bun test ./test/*fleet*.integration.test.ts --timeout 20000` — 62 passed, 683 assertions, 0 failed across 20 files.
- Fresh authenticated runner on port 4030 checked 28 registered routes at
  desktop/mobile. The strict content threshold accepted 53/56; the three
  mobile misses had no errors or overflow and were compact/new or initially
  invalid-detail cases. Isolated reruns with corrected seeded IDs rendered
  cleanly, including the manufacturer new form, status detail, and tag detail.
- Authenticated Fleet archive workflow passed for `fleet-demo-002`: archive
  then restore persisted `archived` and row versions 1 → 3; stale archive
  returned 409 `STALE_RECORD`; Fleet user archive returned 403
  `fleet.write`.

## Next bounded task

Resolve the strict mobile route-matrix threshold cases, complete fresh paired
Odoo comparison, and expand browser CRUD/vehicle workflow coverage before
sign-off.
