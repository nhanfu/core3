# time-off parity progress

Module owner: time-off module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Time Off suite passes 45 tests across 17 files with 485 assertions.
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
