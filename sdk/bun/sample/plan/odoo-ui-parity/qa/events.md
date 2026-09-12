# events QA ledger

QA state: qa-in-progress
QA slot: dispatchable events assignment (pending wave dispatch)
Module owner: events module owner
Verification trigger: feature-complete
Candidate commit: none

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Event attendee lifecycle and full-page-ticket contracts pass in focused
  reruns.
- Authenticated route matrix and Odoo comparison remain pending.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EVENTS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave QA run | — | — | pending |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
