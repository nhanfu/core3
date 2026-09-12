# expenses QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/expenses-desktop.png and expenses-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable expenses assignment (pending wave dispatch)
Module owner: expenses module owner
Verification trigger: feature-complete
Candidate commit: working tree after authenticated Expenses QA

Detailed execution matrix: [`test-plans/expenses.md`](test-plans/expenses.md). It is the module-level source for expense CRUD, workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EXPENSES-001 | Focused Expenses contract corpus | 29 focused tests / 178 assertions across 8 files | PASS |
| EXPENSES-002 | Registered route responsive matrix | 10 routes × desktop/mobile = 20/20; no page/request errors, HTTP failures, or overflow | PASS |
| EXPENSES-003 | Expense lifecycle persistence | `expense-demo-draft` Draft → Submitted → Approved → Posted, versions 1 → 4; journal/date persisted | PASS |
| EXPENSES-004 | Manager permission boundary | Fleet approval returned 403 `expenses.manage` | PASS |
| EXPENSES-005 | Fresh paired Odoo visual and full interaction coverage | Not yet completed for the current candidate | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EXPENSES-BROWSER-001 | No current-wave QA evidence | — | Replaced by EXPENSES-001 through 004 | closed |

## Sign-off

- Functional: pass for tested expense lifecycle and contracts
- Permissions: pass for tested manager boundary
- Persistence/data integrity: pass for tested lifecycle
- Desktop/mobile visual parity: route rendering pass; paired Odoo parity pending
- Tester decision: conditional; remaining interaction and paired visual gates open
