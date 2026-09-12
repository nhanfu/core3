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
