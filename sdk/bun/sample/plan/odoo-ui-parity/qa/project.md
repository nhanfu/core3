# project QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/project-desktop.png and project-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable project assignment (pending wave dispatch)
Module owner: project module owner
Verification trigger: feature-complete
Candidate commit: current working tree

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Project task, dashboard/update, grouped-stage, and permission contracts pass
  in focused reruns.
- Focused Project suite: `bun test ./test/project*.integration.test.ts --timeout 20000` — 44 passed, 0 failed, 506 assertions across 15 files.
- Authenticated module-scoped probes loaded the Project dashboard, milestone, activity, and portal surfaces with seeded IDs. Fleet user opening `/project/settings` received HTTP 403 with `Requires permission: project.settings`, with no browser errors.
- The module-scoped process namespaces routes under `/project` (for example `/project/projects`); using unprefixed `/projects` or `/project/project/settings` is invalid in that runner. Properly namespaced Project list, detail, dashboard, stages, roles, tags, activity types, and activity plans routes loaded cleanly. `/project/tasks/detail` still fails because its declared `yaml.service.timesheets` dependency is not loaded by the single-module runner.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| PROJECT-FUNC-001 | Focused functionality, dashboard, configuration, portal, task, and milestone contracts | 44 tests, 506 assertions; focused suite passed | pass |
| PROJECT-BROWSER-001 | Authenticated seeded Project route probes | Proper `/project/*` list, detail, dashboard, and configuration routes loaded; task detail cross-service dependency remains | partial pass |
| PROJECT-PERM-001 | Non-manager cannot open Project settings | Fleet user received HTTP 403 with `Requires permission: project.settings`; browser errors 0 | pass |
| PROJECT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Route collision, cross-service runner dependency, full CRUD smoke, and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| PROJECT-RUNTIME-001 | Unprefixed paths were invalid for the module-scoped runner; `/project/tasks/detail` raises missing `yaml.service.timesheets` because the runner loads only Project plus Auth | — | Proper namespaced routes passed; task detail requires a full-process or dependency-aware runner retest | follow-up |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
