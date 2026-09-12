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

## Next bounded task

Complete fresh paired Odoo comparison and expand browser CRUD/vehicle workflow
coverage before sign-off.
