# spreadsheet QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/spreadsheet-desktop.png and spreadsheet-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: active
QA slot: dispatchable spreadsheet assignment (pending wave dispatch)
Module owner: spreadsheet module owner
Verification trigger: feature-complete
Candidate commit: pending commit for dashboard lifecycle

Detailed execution matrix: [`test-plans/spreadsheet.md`](test-plans/spreadsheet.md). It is the module-level source for dashboards, workbook runtime, sharing, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SPREADSHEET-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| SPREADSHEET-WORKFLOW-001 | Dashboard publish/archive lifecycle | Focused test executes Draft → Published → Archived, persists `published` and row versions 1 → 3, rejects stale publish and non-manager archive | pass |
| SPREADSHEET-FUNC-001 | Dashboard configuration and public share contracts | `bun test ./test/spreadsheet.integration.test.ts` — 10 tests, 103 assertions | pass for focused contract/workflow scope |

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
