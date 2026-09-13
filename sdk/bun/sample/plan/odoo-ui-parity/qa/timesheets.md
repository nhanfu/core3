# timesheets QA ledger

## Review handoff — candidate `ffa83031` (2026-09-13)

- Conditional evidence reviewed: focused 6 tests / 37 assertions, migrations,
  CRUD/concurrency, selectors, validation, frontend build, audit, and
  diff-check pass.
- Candidate-scope repairs required before integration:
  1. replace the zero employee-cost calculation (`hours * unit_amount`) with
     the intended employee hourly-cost derivation, and add a regression
     assertion for the seeded `Admin User` cost;
  2. declare `mock_data` for `all_timesheet_entries`,
     `timesheet_analysis_totals`, `timesheet_analysis`, `timesheet_entries`,
     `timesheets_settings`, and `timesheet_detail`, or document and obtain
     approval for each runtime-only exception;
  3. commit the inactive-employee rejection assertion already exercised by QA.
- Environmental blockers preserved: live authenticated browser evidence is
  unavailable, and the available Odoo reference has Timesheets uninstalled.
  Pre-existing shared TypeScript diagnostics remain open.

Disposition: **conditional / not signed off; not integrated**. Return these
repairs to the same Timesheets owner and rerun the bounded review against a new
candidate; do not claim module or aggregate completion.

## Review handoff — repair candidate `813ff50b` (2026-09-13)

- Bounded repair integrated after conflict review as `0bba507c`, with its
  prerequisite CRUD migration integrated as `0ee54d30`.
- Verified in the merged active branch: employee-rate cost calculation (8 × 85
  = 680), inactive-employee rejection, six runtime-only justification entries,
  focused Timesheets CRUD suite (3 tests / 27 assertions in the merged slice),
  YAML/API ownership boundary, migration ordering, and `git diff --check`.
- The candidate's reported QA evidence remains recorded: focused 6 tests / 41
  assertions, audit/CSS/frontend/diff-check pass. The literal `mock_data` audit
  remains blocked because the scanner does not accept the runtime-only metadata
  justifications.
- Authenticated Core3 browser evidence and paired desktop/mobile Odoo
  Timesheets comparison remain unavailable/pending. Broader module gates remain
  open, so this is **conditional / not signed off** and does not imply module or
  aggregate completion.

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

Detailed execution matrix: [`test-plans/timesheets.md`](test-plans/timesheets.md). It is the module-level source for entries, approvals, Project integration, actors, persistence, Temporal, and paired Odoo gates.

## Current regression evidence

- Focused Timesheets suite: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 27 passed, 0 failed, 275 assertions across 8 files; the reporting retest after the fix passed 8/8 with 118 assertions.
- Authenticated module-scoped route matrix: 13 routes × desktop/mobile; an isolated fresh-page rerun with valid detail IDs passed 26/26 with no page/request errors or horizontal overflow. The earlier 22/26 bare-route result was a reused-page traversal artifact; Timesheet Analysis exposed a real missing-pivot-fields contract.
- Fix: declared `pivot.fields` for `timesheet_analysis` in `services/timesheets/api/analysis.yaml`; a fresh authenticated retest rendered Pivot/Graph/List with no HTTP or browser failures.
- Authenticated mutation smoke on a fresh `timesheets,project` runner: created Draft → Submitted → Approved with HTTP 200 at each step and row versions 1 → 3. Approval dispatched the Project-owned `project.projects.add_hours` mutation after loading `project_id` and `hours` from the submitted row.
- Permission boundary smoke on the same runner: Fleet received 403 for `/api/pages/timesheets`, `/api/pages/all-timesheets`, `/api/pages/timesheets-settings`, and `timesheets.entries.approve`, with the expected `timesheets.read`, `timesheets.manage`, and `timesheets.settings` permission errors.
- Authenticated CRUD smoke on a fresh runner: Admin create → edit → delete returned HTTP 200, row version advanced 1 → 2, and a post-delete edit was rejected with the expected personal-scope 403. Context-specific CRUD actions are now globally unique so each page invokes its own guard.
- Current paired Odoo/Core3 browser evidence: My Timesheets, All Timesheets, and By Employee captured for both products at 1440x900 and 390x844; 12/12 captures completed with no page/request failures. Files are under `/tmp/odoo-timesheets/*-20260912.png`.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| TIMESHEETS-FUNC-001 | Focused functionality, reports, scoped CRUD, settings, and embedded-task contracts | 27 tests, 275 assertions; focused suite passed | pass |
| TIMESHEETS-BROWSER-001 | Authenticated route matrix | 26/26 isolated fresh-page checks across 13 routes × desktop/mobile, including valid detail IDs; no page/request errors or horizontal overflow | pass |
| TIMESHEETS-FUNC-002 | Timesheet Analysis Pivot/Graph/List runtime | Missing API pivot contract fixed; fresh authenticated retest rendered all three views with no failures | pass |
| TIMESHEETS-FUNC-003 | Cross-module approval workflow | Authenticated create → submit → approve passed; Project hours contract was invoked after approval inputs were assigned from the row | pass |
| TIMESHEETS-PERM-001 | Fleet permission boundary | Fleet denied personal, all-timesheets, settings, and approval endpoints with expected 403 permission errors | pass |
| TIMESHEETS-FUNC-004 | Authenticated CRUD persistence | Admin create → edit → delete passed HTTP 200; post-delete edit rejected; duplicate global action-name regression covered | pass |
| TIMESHEETS-BROWSER-002 | Paired Odoo/Core3 loaded-state comparison | 12 authenticated captures across My, All, and By Employee at desktop/mobile; no page/request failures | partial pass |
| TIMESHEETS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Full parameterized route matrix, role boundaries, authenticated mutation smoke, and paired Odoo comparison remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| TIMESHEETS-QA-001 | Timesheet Analysis requested pivot data but API datasource declared no pivot fields | Current working tree | Added `pivot.fields`; reporting test 6/6 and authenticated Pivot/Graph/List retest passed | fixed |
| TIMESHEETS-QA-002 | Duplicate global CRUD action names caused personal delete to execute task scope | `afe0fa2a` working tree | Context-specific action names plus authenticated create/edit/delete smoke and 27-test suite passed | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: partial; three representative routes paired, remaining enabled routes and interaction states open
- Tester decision: not signed off

## 2026-09-13 coordinator dispatch: next bounded wave

- Existing owner: `agent/odoo-ui-timesheets-next`, worktree
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-timesheets-next`, base
  `813ff50b`. Development event: `DEV-TIMESHEETS-WAVE-20260913`; QA event:
  `QA-TIMESHEETS-WAVE-20260913`; handoff commit `54ddd2b7`.
- Candidate is pending. Target is the next bounded mock-data/employee-cost or
  employee-validation repair. Focused tests, audit, CSS/frontend build,
  scoped ESLint, and diff-check are required before triggering existing QA.
  Aggregate progress remains untouched.
## 2026-09-13 coordinator reactivation

- Existing owner `agent/odoo-ui-timesheets-next` is reactivated on the same
  worktree. Resolve the literal `mock_data` audit exception for six sources
  and add one focused employee-cost/employee-validation parity repair.
- Existing development event `DEV-TIMESHEETS-WAVE-20260913` and QA event
  `QA-TIMESHEETS-WAVE-20260913` remain assigned. Candidate is pending; no
  aggregate progress change.
## 2026-09-13 owner checkpoint

- `22f581f3` and `737c264d` are dispatch/checkpoint commits only; no product
  candidate has been submitted. QA remains untriggered pending a self-contained
  implementation commit and evidence.
## 2026-09-13 poll after `737c264d`

- No product diff exists after the checkpoint; owner was re-prompted. QA event
  remains untriggered pending implementation and focused tests.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-TIMESHEETS-VISUAL-WAVE-20260913-R2` → `QA-TIMESHEETS-VISUAL-WAVE-20260913-R2` | existing `agent/odoo-ui-timesheets-visual3-20260912` in `/home/nhanjs/projects/core3-worktrees/timesheets-visual3-20260912` | File-backed restart persistence for entries/approvals and linked hours, migration replay, scope, stale/duplicate/employee guards, and focused tests | dispatched in `096f7239`; awaiting self-contained product commit before QA |
