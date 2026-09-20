# appraisals QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/appraisals-desktop.png and appraisals-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable appraisals assignment (pending wave dispatch)
Module owner: appraisals module owner
Verification trigger: feature-complete
Candidate commit: cca3203a8cd0dea23e54941acc019b1f6bd57a3e

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| APP-PAGE-001 | Page/API contracts join by page.id; visible List/Kanban tabs and all analysis sources are declared | test/appraisals.integration.test.ts; candidate cca3203a | pass |
| APP-FUNC-001 | Idempotent migrations, all five workflow states, create/edit/stale-write guards, guarded transitions, completion requirements, and delete protection | bun test ./test/appraisals.integration.test.ts --timeout 20000 — 2 passed / 25 assertions | pass |
| APPRAISALS-PENDING-001 | Authenticated Core3 CRUD/workflow browser matrix and paired Odoo desktop/mobile comparison | No current Odoo Appraisal menu; browser evidence not yet captured for cca3203a | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave QA run | — | — | pending |

## Sign-off

- Functional: pass for focused repository/API contract cases; browser interaction remains open
- Permissions: pass for declared action boundaries and workflow permissions; authenticated actor matrix remains open
- Persistence/data integrity: pass for focused migration/CRUD/workflow/concurrency cases
- Desktop/mobile visual parity: pending
- Tester decision: conditional; no module sign-off
