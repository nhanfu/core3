# livechat QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/livechat-desktop.png and livechat-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable livechat assignment (pending wave dispatch)
Module owner: livechat module owner
Verification trigger: feature-complete
Candidate commit: none

Detailed execution matrix: [`test-plans/livechat.md`](test-plans/livechat.md). It is the module-level source for sessions, channels, bots, reporting, actors, persistence, Temporal, and paired Odoo gates.

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Live Chat formerly failing Looking for Help and partner-history cases now
  pass in focused reruns after deterministic fixture and contract repairs.
- Focused Sessions suite: `bun test ./test/livechat_sessions.integration.test.ts` — 4 passed, 35 assertions; the lifecycle uses the Help Queue-owned `join` action and persists the session through close.
- Authenticated desktop/mobile route matrix and Odoo comparison remain pending.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| LIVECHAT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| LIVECHAT-WORKFLOW-001 | Visitor session lifecycle | Authenticated API test traverses In Progress → Waiting → In Progress → Looking for Help → In Progress → Closed, persists visitor/channel/operator/outcome and versions 1 → 6, and rejects closed-session replay | pass |

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
