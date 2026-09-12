# manufacturing QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/manufacturing-desktop.png and manufacturing-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable manufacturing assignment (pending wave dispatch)
Module owner: manufacturing module owner
Verification trigger: feature-complete
Candidate commit: working tree after authenticated manufacturing QA

Detailed execution matrix: [`test-plans/manufacturing.md`](test-plans/manufacturing.md). It is the module-level source for manufacturing CRUD, workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MANUFACTURING-001 | Full focused contract corpus and route matrix | 59 focused tests / 674 assertions; 32 routes × desktop/mobile = 64/64; no page/request errors or overflow | PASS |
| MANUFACTURING-002 | Authenticated work-order lifecycle and stale boundary | Admin `wo-blocked-001`: Waiting → Ready → Progress/paused → Ready → Blocked, versions 1 → 6; stale plan 409 | PASS |
| MANUFACTURING-003 | Permission boundary | Fleet user plan action returned 403 `manufacturing.write` | PASS |
| MANUFACTURING-004 | Fresh paired Odoo/Core3 visual comparison for every accepted surface | Existing source captures are recorded, but no fresh current-wave pair is adjudicated | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| MANUFACTURING-BROWSER-001 | Current candidate had no verified QA evidence | — | Replaced by MANUFACTURING-001 through 003 | closed |

## Sign-off

- Functional: pass for current tested contracts and work-order lifecycle
- Permissions: pass for tested read/write boundary
- Persistence/data integrity: pass for tested workflow row versions/state changes
- Desktop/mobile visual parity: pending
- Tester decision: conditional; no module sign-off until paired Odoo and remaining interaction gates close

## Merge review record — candidate `383583f6` / QA `112ed911`

- The QA results were retained as conditional evidence: 10 tests/108
  assertions, audit, CSS build, and diff check passed; authenticated browser,
  actor/restart, and paired Odoo gates remained open.
- The product candidate was not integrated because its API/page/test files
  conflict with the active Work Orders Analysis implementation. No
  Manufacturing sign-off is implied.
