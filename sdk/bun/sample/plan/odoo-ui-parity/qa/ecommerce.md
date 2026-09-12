# ecommerce QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/ecommerce-desktop.png and ecommerce-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable ecommerce assignment (pending wave dispatch)
Module owner: ecommerce module owner
Verification trigger: feature-complete
Candidate commit: working tree after Ecommerce Categories slice

Current isolated runner inventory (4041): the manifest registers 8 routes;
page/API contracts are present for Products, Pricelists, Pricelist detail,
Categories, and the Orders list. Unpaid Orders, Abandoned Carts, Customers,
and the Orders detail page remain unimplemented route surfaces.

Detailed execution matrix: [`test-plans/ecommerce.md`](test-plans/ecommerce.md). It is the module-level source for catalog, pricelists, commerce workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| ECOMMERCE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| ECOMMERCE-FUNC-002 | Categories page/API, deterministic data and permissioned CRUD contracts | `bun test ./test/ecommerce*.integration.test.ts` — 6 tests, 43 assertions | pass |
| ECOMMERCE-FUNC-003 | Orders list/API, deterministic search/status/empty contracts | `bun test ./test/ecommerce_orders.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-SCOPE-001 | Manifest-to-page/API coverage | Isolated `/api/modules` inventory on port 4041 confirms 8 registered routes and 4 implemented page/API route families; 4 commerce route families remain unimplemented | pending |

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
