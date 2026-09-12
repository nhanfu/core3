# blog QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/blog-desktop.png and blog-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: dormant
QA slot: dispatchable blog assignment (pending wave dispatch)
Module owner: blog module owner
Verification trigger: feature-complete
Candidate commit: none

Detailed execution matrix: [`test-plans/blog.md`](test-plans/blog.md). It is the module-level source for blogs, posts, taxonomy, publication, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| BLOG-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |

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
