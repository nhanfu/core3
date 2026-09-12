# recruitment QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/recruitment-desktop.png and recruitment-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable recruitment assignment (pending wave dispatch)
Module owner: recruitment module owner
Verification trigger: feature-complete
Candidate commit: current working tree

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Applicant view navigation and analysis contracts pass in focused reruns.
- Focused Recruitment suite: `bun test ./test/recruitment*.integration.test.ts --timeout 20000` — 35 passed, 0 failed, 336 assertions across 10 files.
- Authenticated module-scoped route matrix: 15 routes × desktop/mobile; 29/30 completed cleanly on the first pass, and the `/openings` route passed an isolated retest at both the declared alias and normalized `/recruitment/openings` route. No persistent page, request, or overflow defect remains in this matrix.
- Fleet user permission boundary: `/recruitment/settings` returned HTTP 403 with `Requires permission: recruitment.settings`, with no browser errors.
- Authenticated applicant workflow on the module-scoped process: created an applicant for `JOB/2026/0001`, then advanced New → Screening → Interview → Offer → Hired; all responses returned 200 and the applicant row version advanced `1 → 5`.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| RECRUITMENT-FUNC-001 | Focused functionality, CRUD, workflow, catalogs, settings, and activity contracts | 35 tests, 336 assertions; focused suite passed | pass |
| RECRUITMENT-BROWSER-001 | Authenticated registered-menu route matrix | 15 routes × desktop/mobile; 30/30 after isolated `/openings` retest | pass |
| RECRUITMENT-PERM-001 | Non-manager cannot open Recruitment settings | Fleet user received HTTP 403 with `Requires permission: recruitment.settings`; browser errors 0 | pass |
| RECRUITMENT-WORKFLOW-001 | Applicant create and hiring workflow | Authenticated create plus New → Screening → Interview → Offer → Hired returned 200; row version 1 → 5 | pass |
| RECRUITMENT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Functional, route, and one manager permission boundary pass; authenticated CRUD mutation smoke and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| RECRUITMENT-BROWSER-001 | Initial matrix observed a late applicant-detail request while leaving `/applicants`; `/openings` isolated retest was clean and normalized to `/recruitment/openings` | — | Isolated route retest passed with no errors | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
