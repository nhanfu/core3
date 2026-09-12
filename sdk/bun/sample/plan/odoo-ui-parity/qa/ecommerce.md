# ecommerce QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/ecommerce-desktop.png and ecommerce-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

## Current browser evidence (2026-09-13)

- Core3 authenticated as `admin@tms.local` against a fresh memory runtime.
  Mobile 390x844 captured the normal Shop → Cart → Checkout state before the
  mutation; desktop 1440x900 submitted Confirm Order and rendered the converted
  cart. Captures are under `/tmp/core3-odoo-parity/ecommerce-checkout-20260913/`;
  no console, page, or failed-request entries were reported. The desktop flow
  created `WEB/2026/0004` for `285 USD` and copied two order lines.
- Paired Odoo authentication succeeded as `codex@core3.local`, but the current
  authenticated reference app launcher exposes no Website/eCommerce app and
  `http://localhost:8069/shop` returns HTTP 404. This is the exact blocker for
  paired Odoo Shop/Checkout comparison; no Odoo visual-parity claim is made
  until a reference database with `website_sale` installed is available.

QA state: qa-in-progress
QA slot: dispatchable ecommerce assignment (pending wave dispatch)
Module owner: ecommerce module owner
Verification trigger: feature-complete
Candidate commit: working tree after Ecommerce Categories slice

Current isolated runner inventory (4041): the manifest registers 9 routes;
 page/API contracts are present for all 9 manifest routes plus the linked
 Product detail and Checkout routes: Products, Product detail, Pricelists,
 Pricelist detail, Categories, Orders list/detail, Unpaid Orders, Abandoned
 Carts, Customers, Cart, and Shop. Cart has persisted summary/line contracts;
 Shop is covered at contract level and Checkout now has a persisted order
 mutation; authenticated browser proof remains open.

Detailed execution matrix: [`test-plans/ecommerce.md`](test-plans/ecommerce.md). It is the module-level source for catalog, pricelists, commerce workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| ECOMMERCE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Fresh-runtime authenticated mobile and desktop Shop → Cart → Checkout capture at `/tmp/core3-odoo-parity/ecommerce-checkout-20260913/`; desktop Confirm Order persisted the converted cart and mobile normal Checkout rendered before the mutation; no console/request failures | pending: paired Odoo comparison is blocked by reference 404; authenticated actor/company, restart, and external payment gates remain |
| ECOMMERCE-FUNC-002 | Categories page/API, deterministic data and permissioned CRUD contracts | `bun test ./test/ecommerce*.integration.test.ts` — 18 tests, 97 assertions | pass |
| ECOMMERCE-FUNC-003 | Orders list/API, deterministic search/status/empty contracts | `bun test ./test/ecommerce_orders.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-FUNC-004 | Order detail form/API, persisted read and not-found contract | Same focused Orders test — 2 tests, 13 assertions | pass |
| ECOMMERCE-FUNC-005 | Unpaid Orders list/API and unpaid-state filter | `bun test ./test/ecommerce_unpaid_orders.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-FUNC-006 | Abandoned Carts list/API and deterministic read boundary | `bun test ./test/ecommerce_abandoned_carts.integration.test.ts` — 2 tests, 9 assertions | pass |
| ECOMMERCE-FUNC-007 | Customers list/API, summary data and order navigation | `bun test ./test/ecommerce_customers.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-FUNC-008 | Cart summary/lines, totals, navigation and quantity guard | `bun test ./test/ecommerce_cart.integration.test.ts` — 2 tests, 7 assertions | pass |
| ECOMMERCE-FUNC-009 | Shop page/API, published-product visibility and cart navigation contract | `bun test ./test/ecommerce_shop.integration.test.ts` — 2 tests, 9 assertions | pass at contract level; authenticated add-to-cart persistence planned |
| ECOMMERCE-FUNC-010 | Product detail page/API, persisted read, guarded edit, stale and duplicate-reference boundaries | `bun test ./test/ecommerce_product_detail.integration.test.ts` — 2 tests, 9 assertions | pass |
| ECOMMERCE-FUNC-011 | Checkout validation, persisted order/line creation, cart conversion, and repeat-checkout guard | `bun test ./test/ecommerce_checkout.integration.test.ts` — 4 tests, 22 assertions | pass at service level; authenticated browser workflow captured |
| ECOMMERCE-FUNC-012 | Migration rerun/idempotency and wrong-company isolation for catalog and commerce records | Same focused Checkout test — 4 tests, 22 assertions | pass at service level |
| ECOMMERCE-SCOPE-001 | Manifest-to-page/API coverage | Current implementation covers all 9 registered Ecommerce routes plus linked Product detail and Checkout routes | pass for route coverage; browser journey pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| ECOMMERCE-UI-001 | Checkout route smoke initially lacked a visible Confirm Order action and did not carry cart context into the form | `8dd5f55` plus `12b03e67` | Authenticated desktop/mobile retest reached the form; desktop submission converted the cart with no console/request failures | pass for current Core3 flow; paired Odoo comparison blocked by missing installed `website_sale` |

## Sign-off

- Functional: service-level checkout and authenticated Core3 submit path pass
- Permissions: service-level company/customer boundaries pass; authenticated actor matrix pending
- Persistence/data integrity: service-level checkout and migration rerun pass; restart workflow pending
- Desktop/mobile visual parity: Core3 evidence pass; paired Odoo blocked (`/shop` 404)
- Tester decision: not signed off
