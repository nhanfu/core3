# surveys QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/surveys-desktop.png and surveys-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable surveys assignment (pending wave dispatch)
Module owner: surveys module owner
Verification trigger: feature-complete
Candidate commit: `1859b836edadc73bad3b432a7622b73fba684fa3`

## Test-case inventory

## Current regression evidence

- Candidate-bounded QA: `bun test ./test/surveys*.integration.test.ts --timeout 20000` — **34 passed, 0 failed, 305 assertions across 5 files**.
- Forward durable migration replay passed on fresh DuckDB: applying all 17 migrations twice left 17 migration rows, 5 seeded response rows, and one `idempotency_key` column on both runs (`stable: true`). Full-chain rollback to `0.0.16` is blocked on DuckDB with `Dependency Error: Cannot alter entry "survey_responses" because there are entries that depend on it.`
- Fresh module process `http://127.0.0.1:4035`: public start and authenticated `/surveys` passed at 1440x900 and 390x844 with no page/request errors or horizontal overflow. Captures: `/tmp/core3-qa-surveys-public-start-desktop.png`, `/tmp/core3-qa-surveys-public-start-mobile.png`, `/tmp/core3-qa-surveys-auth-desktop.png`, `/tmp/core3-qa-surveys-auth-mobile.png`.
- Fresh public API checks: keyed start retry returned 200 and the same response ID; missing required answers returned 422 without mutation; keyed submit and retry returned 200, `Submitted`, and the same response ID. Focused assertions verified one response row and one response-count increment.
- Permission/token checks: Fleet received 403 from `/api/pages/surveys?lc=en` with `Requires permission: surveys.read`; invalid public API token returned 404 `Survey is unavailable` with no disclosure. `bun run audit` passed (659 pages, 668 routes, 1,139 datasources); scoped `git diff --check` passed.
- Full repository regression `bun test ./test --timeout 20000` was started but interrupted at the user's request while still running; it is not a completed full-suite pass.

- Public response retry/idempotency follow-up: `surveys_public_response.integration.test.ts` verifies repeated start with the same key returns the original answer, repeated submit with the same key returns 200, and the response row/count remain single-write; migration `0.0.17` adds a durable unique key.

- Focused Surveys suite: `bun test ./test/surveys*.integration.test.ts --timeout 20000` — 34 passed, 0 failed, 305 assertions across 5 files.
- Module-scoped authenticated route matrix on the developer process (`bun run agent:module -- surveys --port=4010`): 14 routes × desktop/mobile = 28/28 passed, with no blank page, browser error, HTTP error, or horizontal overflow.
- Fleet user permission boundary: `/surveys` returned HTTP 403 with `Requires permission: surveys.read`, with no browser errors.
- Authenticated lifecycle persistence on the module-scoped process: created a survey and question, then Draft → Published → Closed → Archived → Draft; all responses returned 200 and the survey row version advanced `1 → 5`.
- The pre-existing shared process on port 3002 returned `Unknown page` for the same routes; the module-scoped process loaded them successfully. This is recorded as a process freshness/integration follow-up, not as a Surveys implementation failure.
- Current module-scoped rerun on port 4034 checked all 14 registered Surveys
  routes at desktop/mobile: 28/28 passed with no page errors, failed requests,
  HTTP errors, redirect/blank states, or horizontal overflow.
- Authenticated mobile Close action on `survey-demo-feedback` returned 200,
  changed the visible action set, and persisted `Closed` after reload.
- The detailed module plan is approved at `qa/test-plans/surveys.md`.
- Public participant response workflow: fresh database/API-handler test starts a token response, rejects missing required answers without mutation, saves answer progress, submits respondent identity/answers, increments the survey response count, and rejects duplicate submission with 409.

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SURVEYS-FUNC-001 | Focused functionality, CRUD, workflow, invitation, print, and delete contracts | 34 tests, 305 assertions; focused suite passed | pass |
| SURVEYS-BROWSER-001 | Authenticated registered-menu route matrix | 14 routes × desktop/mobile = 28/28 on module-scoped process | pass |
| SURVEYS-PERM-001 | Non-member cannot read Surveys | Fleet user received HTTP 403 with `Requires permission: surveys.read`; browser errors 0 | pass |
| SURVEYS-WORKFLOW-001 | Survey create, question persistence, and lifecycle transitions | Authenticated create/question plus Draft → Published → Closed → Archived → Draft returned 200; row version 1 → 5 | pass |
| SURVEYS-WORKFLOW-002 | Public token response lifecycle | `surveys_public_response.integration.test.ts` rejects missing required answers without mutation, persists start/progress/submit and respondent data, increments response count, and returns 409 for duplicate submit | pass |
| SURVEYS-RUNTIME-001 | Shared-process registration freshness | Shared port 3002 returned page 404s while fresh module process on 4010 passed 28/28 | follow-up |
| SURVEYS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Focused contracts, lifecycle/permission evidence, current 14-route matrix, and mobile Close persistence are recorded; paired Odoo comparison and broader public/actor coverage remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-RUNTIME-001 | Shared process was stale and did not serve registered Surveys pages | — | Fresh module-scoped process served all 28 checks; shared-process restart/retest remains required | follow-up |
| SURVEYS-MIGRATION-001 | DuckDB full-chain rollback to `0.0.16` fails because dependent entries prevent altering `survey_responses` | — | Forward apply/reapply is stable; rollback/replay-down remains required | blocker |

## Sign-off

- Functional: partial pass (focused suite passed)
- Permissions: partial pass (read boundary passed; mutation-role matrix remains)
- Persistence/data integrity: partial pass (authenticated Close persistence and contract tests pass; restart coverage remains)
- Desktop/mobile visual parity: current route smoke pass; paired comparison pending
- Tester decision: bounded candidate QA recorded; not signed off. Full regression, rollback/replay-down, complete actor mutation matrix, and full paired Odoo visual comparison remain open.
