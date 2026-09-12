# events QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/events-desktop.png and events-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable events assignment (pending wave dispatch)
Module owner: events module owner
Verification trigger: feature-complete
Candidate commit: none

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Focused Events suite: `bun test ./test/events*.integration.test.ts --timeout 20000` — 82 passed, 0 failed, 604 assertions across 29 files.
- Authenticated Core3 browser create flow: admin opened `/events`, created `QA Browser Event 20260912` with required name/start time, received a successful mutation, and saw the persisted row after refresh; no page errors, failed requests, or HTTP errors.
- Artifact: `/tmp/core3-odoo-parity/events-create-desktop-20260912.png`.
- The first browser attempt exposed an empty optional `end_at` timestamp defect; the form contract was corrected by declaring both event date fields as `datetime`, preserving Core3's text-based ISO date/time input convention.
- Authenticated route matrix and paired Odoo comparison remain pending for full module sign-off.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EVENTS-FUNC-001 | Focused functional/contract suite for event lifecycle, reports, CRUD, and guards | 82 tests, 604 assertions; `bun test ./test/events*.integration.test.ts --timeout 20000` | pass |
| EVENTS-FUNC-002 | Authenticated create and persistence smoke | `/events`; created `QA Browser Event 20260912`; persisted in 1-11/11 list; screenshot artifact recorded | pass |
| EVENTS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Current evidence covers focused contracts and one create flow; complete matrix/Odoo comparison not yet run | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EVENTS-BROWSER-001 | Optional empty `end_at` submitted as an invalid timestamp during create | Current change; event `start_at`/`end_at` fields declared `datetime` | Retested authenticated create successfully; no errors/failed requests | fixed |

## Sign-off

- Functional: partial pass (focused suite and create flow pass)
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
