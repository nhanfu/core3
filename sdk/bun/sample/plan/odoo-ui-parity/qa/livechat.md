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
Candidate commit: 61296530

Detailed execution matrix: [`test-plans/livechat.md`](test-plans/livechat.md). It is the module-level source for sessions, channels, bots, reporting, actors, persistence, Temporal, and paired Odoo gates.

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Live Chat formerly failing Looking for Help and partner-history cases now
  pass in focused reruns after deterministic fixture and contract repairs.
- Focused Sessions suite: `bun test ./test/livechat_sessions.integration.test.ts` — 4 passed, 35 assertions; the lifecycle uses the Help Queue-owned `join` action and persists the session through close.
- Full Live Chat-focused suite: `bun test ./test/livechat*.integration.test.ts --timeout 20000` — 58 passed, 632 assertions, 0 failed across 18 files.
- Isolated runner `:4327` rendered Sessions at desktop 1440x900 and mobile
  390x844, and opening seeded Visitor A loaded the Session detail side panel;
  all requests and page errors were clean with no horizontal overflow. Captures:
  `/tmp/core3-odoo-parity/livechat-sessions-desktop.png`,
  `livechat-sessions-mobile.png`, and the detail state was verified from the
  authenticated browser.

## Assigned operator scope evidence (2026-09-13)

- Focused test: `bun test ./test/livechat_sessions.integration.test.ts --timeout 20000`
  — 5 passed, 38 assertions.
- `view_scope: assigned` returns only sessions whose durable `operator_id`
  matches the authenticated operator. A close request for another operator's
  session returns 403 with `LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE`; the
  session remains `In Progress` at `row_version` 1.
- Migration reapplication remains covered by the existing session migration
  tests; the new stable second-operator fixture is inserted idempotently.
- This is API/contract evidence only. Authenticated browser actor coverage,
  restart verification, and paired Odoo comparison remain open.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| LIVECHAT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| LIVECHAT-WORKFLOW-001 | Visitor session lifecycle | Authenticated API test traverses In Progress → Waiting → In Progress → Looking for Help → In Progress → Closed, persists visitor/channel/operator/outcome and versions 1 → 6, and rejects closed-session replay | pass |
| LIVECHAT-FUNC-001 | Sessions, channels, bots, configuration, history, reporting, and technical views | Full focused suite 58/58, 632 assertions across 18 files | pass for tested contracts |
| LIVECHAT-BROWSER-001 | Authenticated Sessions list and detail side panel | Isolated runner `:4327`; desktop/mobile list and seeded Visitor A detail loaded without failed requests, page errors, or overflow; captures recorded above | pass for Core3 runtime; paired Odoo comparison and browser mutations remain open |
| LIVECHAT-PERM-002 | Assigned operator session list/detail and transitions | Focused Sessions test; assigned operator cannot see or close another operator's session, and the row is unchanged | pass at API/contract level; browser actor matrix remains open |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| LIVECHAT-QA-001 | Detail side-panel form-view aliases were previously vulnerable to file-stem/page-ID mismatch | current shared alias repair | Sessions list and Visitor A detail retest passed at `:4327` with no failed requests | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
