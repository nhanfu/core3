# forum QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/forum-desktop.png and forum-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable forum assignment (pending wave dispatch)
Module owner: forum module owner
Verification trigger: feature-complete
Candidate commit: working tree after Forum QA planning

Detailed execution matrix: [`test-plans/forum.md`](test-plans/forum.md). It is the module-level source for forums, posts, moderation, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| FORUM-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| FORUM-FUNC-001 | Forum and Post Pages YAML contract corpus | `bun test ./test/forum*.integration.test.ts` — 7 tests, 43 assertions | pass |
| FORUM-PUBLIC-001 | Unauthenticated public question list/detail boundary | Public Active question renders at desktop/mobile with 200 response, no browser errors or overflow; missing and flagged IDs return 404; SQL contract includes Closed visibility and Flagged exclusion; captures `/tmp/core3-odoo-parity/forum-public-desktop.png` and `forum-public-mobile.png` | pass |
| FORUM-WORKFLOW-001 | Post close/reopen lifecycle | Focused test executes close and reopen, persists moderator reason and versions 1 → 3, and rejects invalid repeated transitions with 409 | pass |

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
