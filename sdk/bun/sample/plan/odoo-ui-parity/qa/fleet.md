# fleet QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/fleet-desktop.png and fleet-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable fleet assignment (pending wave dispatch)
Module owner: fleet module owner
Verification trigger: feature-complete
Candidate commit: working tree after vehicle create contract slice

Detailed execution matrix: [`test-plans/fleet.md`](test-plans/fleet.md). It is the module-level source for the remaining CRUD, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| FLEET-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| FLEET-001 | Focused Fleet contract corpus | 62 focused tests / 683 assertions across 20 files | PASS |
| FLEET-002 | Registered route responsive smoke | Corrected 28-route matrix reached 55/56 on the first pass; the only miss was a mobile `/fleet/config/tags` early-shell sample. An isolated rerun after the normal render wait produced the full tag table with no errors, failed requests, or overflow | PASS |
| FLEET-003 | Vehicle archive/restore persistence | `fleet-demo-002` archive → restore, row versions 1 → 3; stale archive 409 | PASS |
| FLEET-004 | Permission boundary | Fleet user archive returned 403 `fleet.write` | PASS |
| FLEET-005 | Fresh paired Odoo visual comparison and complete browser CRUD | Not complete for current candidate | pending |
| FLEET-006 | Vehicle create validation and persistence | 2 focused tests / 10 assertions; valid create reloaded with database defaults; required/type/odometer/date/duplicate guards returned explicit 422/409 errors without inserting rows; full Fleet corpus 64/693 across 21 files | PASS for declarative API contract; authenticated browser create and restart persistence remain pending |

## Sign-off

- Functional: pass for tested Fleet contracts and vehicle workflow
- Current-wave vehicle create contract: pass; browser mutation and restart
  evidence remain open
- Permissions: pass for tested write boundary
- Persistence/data integrity: pass for archive/restore workflow
- Desktop/mobile visual parity: route smoke pass; paired parity pending
- Tester decision: pass for route smoke; paired Odoo and complete interaction gates remain open
