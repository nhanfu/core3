# livechat QA ledger

QA state: qa-in-progress
QA slot: dispatchable livechat assignment (pending wave dispatch)
Module owner: livechat module owner
Verification trigger: feature-complete
Candidate commit: none

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Live Chat formerly failing Looking for Help and partner-history cases now
  pass in focused reruns after deterministic fixture and contract repairs.
- Authenticated desktop/mobile route matrix and Odoo comparison remain pending.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| LIVECHAT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |

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
