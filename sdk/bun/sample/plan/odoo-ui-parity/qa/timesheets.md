# timesheets QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/timesheets-desktop.png and timesheets-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable timesheets assignment (pending wave dispatch)
Module owner: timesheets module owner
Verification trigger: feature-complete
Candidate commit: current working tree

## Current regression evidence

- Focused Timesheets suite: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 26 passed, 0 failed, 273 assertions across 8 files; the reporting retest after the fix passed 7/7 with 116 assertions.
- Authenticated module-scoped route matrix: 13 routes × desktop/mobile; an isolated fresh-page rerun with valid detail IDs passed 26/26 with no page/request errors or horizontal overflow. The earlier 22/26 bare-route result was a reused-page traversal artifact; Timesheet Analysis exposed a real missing-pivot-fields contract.
- Fix: declared `pivot.fields` for `timesheet_analysis` in `services/timesheets/api/analysis.yaml`; a fresh authenticated retest rendered Pivot/Graph/List with no HTTP or browser failures.
- Authenticated mutation smoke on a fresh `timesheets,project` runner: created Draft → Submitted → Approved with HTTP 200 at each step and row versions 1 → 3. Approval dispatched the Project-owned `project.projects.add_hours` mutation after loading `project_id` and `hours` from the submitted row.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| TIMESHEETS-FUNC-001 | Focused functionality, reports, scoped CRUD, settings, and embedded-task contracts | 24 tests, 266 assertions; focused suite passed | pass |
| TIMESHEETS-BROWSER-001 | Authenticated route matrix | 26/26 isolated fresh-page checks across 13 routes × desktop/mobile, including valid detail IDs; no page/request errors or horizontal overflow | pass |
| TIMESHEETS-FUNC-002 | Timesheet Analysis Pivot/Graph/List runtime | Missing API pivot contract fixed; fresh authenticated retest rendered all three views with no failures | pass |
| TIMESHEETS-FUNC-003 | Cross-module approval workflow | Authenticated create → submit → approve passed; Project hours contract was invoked after approval inputs were assigned from the row | pass |
| TIMESHEETS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Full parameterized route matrix, role boundaries, authenticated mutation smoke, and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| TIMESHEETS-QA-001 | Timesheet Analysis requested pivot data but API datasource declared no pivot fields | Current working tree | Added `pivot.fields`; reporting test 6/6 and authenticated Pivot/Graph/List retest passed | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
