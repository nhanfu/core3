# time-off parity progress

Module owner: time-off module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Time Off suite passes 47 tests across 18 files with 497 assertions.
The authenticated registered-menu matrix passes 32/32 desktop/mobile checks
across 16 routes. An authenticated request was created, submitted, and
approved successfully, with row versions advancing from 1 to 3.
The Fleet user permission boundary was also checked: `/time-off/time-off-approval`
returned HTTP 403 with `Requires permission: time_off.manage`, with no browser
errors. Separate authenticated probes also persisted Refused and Cancelled
states, including a cancellation reason, through their complete transitions.
Complete permission boundaries, full CRUD/workflow coverage, and paired Odoo
desktop/mobile comparison remain open. No full parity claim is made here.

## QA evidence for fc310247 (2026-09-13)

- Isolated deletion test passed: 2 tests, 12 assertions.
- Full focused Time Off regression passed: 47 tests, 497 assertions across 18
  files.
- Authenticated admin HTTP checks passed: missing request 404, non-Draft 409,
  stale Draft 409, matching Draft 200; failed guards left no deletion and the
  deleted row was absent on subsequent lookup.
- Permission checks passed: dispatcher 403 for missing `time_off.write`, and
  unauthenticated request 401.
- `bun run audit` and `git diff --check fc310247^ fc310247` passed.
- Repository typecheck remains red on pre-existing errors outside the candidate;
  the sample package declares no lint script.
- No authenticated desktop/mobile browser or paired Odoo screenshots were
  available in this session. Odoo was reachable only at its unauthenticated
  login redirect. Restart persistence and the complete actor/adapter matrix
  remain unverified.

## Next bounded task

Run role-specific permission checks, cancellation/refusal/balance persistence
flows, and paired Odoo desktop/mobile captures; then update this file only with
evidence from the matching module owner.

## QA retest ledger — `fc310247` (2026-09-13)

The draft-request deletion slice passed 2 tests with 12 assertions. Only
unchanged Draft requests can be deleted; missing, non-Draft, and stale rows
are rejected with deterministic 404/409 guards. The full focused Time Off
suite passes 47 tests with 497 assertions. This slice does not constitute
functional, permission, persistence, or paired Odoo sign-off.
