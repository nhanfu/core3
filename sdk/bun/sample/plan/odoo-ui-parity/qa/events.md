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
Candidate commit: `f7a38e86`

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Focused Events suite: `bun test ./test/events*.integration.test.ts --timeout 20000` — 82 passed, 0 failed, 608 assertions across 29 files.
- Authenticated Core3 browser create flow: admin opened `/events`, created `QA Browser Event 20260912` with required name/start time, received a successful mutation, and saw the persisted row after refresh; no page errors, failed requests, or HTTP errors.
- Artifact: `/tmp/core3-odoo-parity/events-create-desktop-20260912.png`.
- Authenticated Events route matrix: 14 registered menu routes at desktop and mobile — 28/28 passed with no blank/redirect result, page error, failed request, HTTP error, or horizontal overflow; raw result: `/tmp/core3-odoo-parity/events-matrix-20260912.json`.
- Permission boundary: `fleet@tms.local` reached `/events` but received `Requires permission: events.read` with the expected 403 page-data response; no browser errors.
- Authenticated lifecycle mutation probe: created `QA Lifecycle Event 20260912`, then advanced Draft → Published → In Progress → Completed with 200 responses and row versions 1 → 2 → 3 → 4.
- Authenticated registration probe: created and published a capacity-1 event, registered the first attendee successfully (200, `Registered`), and the second attendee was rejected with the declared 409 capacity guard; the registration response included a persisted registration id and timestamp.
- Authenticated edit probe: updated an event name/start time and explicitly cleared nullable `end_at` successfully (200, row version 1 → 2); replaying the old version was rejected with 409 `STALE_RECORD`.
- Authenticated delete probe: deleted an eligible Draft event successfully (200), while deletion of a Published event was rejected with the declared 409 `EVENT_NOT_DRAFT` guard.
- The first browser attempt exposed an empty optional `end_at` timestamp defect; the form contract was corrected by declaring both event date fields as `datetime`, preserving Core3's text-based ISO date/time input convention.
- Authenticated route matrix and paired Odoo comparison remain pending for full module sign-off.
- Fresh module-scoped rerun on port 4025 passed the registered-menu matrix 28/28 (14 routes × desktop/mobile) with no page errors, failed requests, HTTP errors, or horizontal overflow; raw result: `/tmp/events-matrix-fresh.json`.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EVENTS-FUNC-001 | Focused functional/contract suite for event lifecycle, reports, CRUD, and guards | 82 tests, 608 assertions; `bun test ./test/events*.integration.test.ts --timeout 20000` | pass |
| EVENTS-FUNC-002 | Authenticated create and persistence smoke | `/events`; created `QA Browser Event 20260912`; persisted in 1-11/11 list; screenshot artifact recorded | pass |
| EVENTS-BROWSER-002 | Authenticated registered-menu route matrix | Fresh module-scoped process: 14 routes × desktop/mobile = 28/28; raw JSON result recorded | pass |
| EVENTS-PERM-001 | Read permission boundary | Fleet user denied `events.read` with expected 403/permission page | pass |
| EVENTS-WORKFLOW-001 | Event lifecycle transitions with optimistic row versions | Authenticated sequence completed Draft → Published → In Progress → Completed; each response 200 and incremented `row_version` | pass |
| EVENTS-WORKFLOW-002 | Registration persistence and capacity guard | Capacity-1 event accepted first registration (200) and rejected second registration (409) | pass |
| EVENTS-FUNC-003 | Event edit, nullable datetime clear, and stale-row guard | Update returned 200 with row version increment; stale update returned 409 `STALE_RECORD` | pass |
| EVENTS-FUNC-004 | Event delete and lifecycle safety guard | Eligible Draft delete returned 200; Published delete returned 409 `EVENT_NOT_DRAFT` | pass |
| EVENTS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Current evidence covers focused contracts and one create flow; complete matrix/Odoo comparison not yet run | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EVENTS-BROWSER-001 | Optional empty `end_at` submitted as an invalid timestamp during create | Current change; event `start_at`/`end_at` fields declared `datetime` | Retested authenticated create successfully; no errors/failed requests | fixed |

## Sign-off

- Functional: partial pass (focused suite and create flow pass)
- Permissions: partial pass (route denial verified; mutation-specific boundaries remain)
- Persistence/data integrity: partial pass (event and registration persistence verified; broader CRUD reload coverage remains)
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
