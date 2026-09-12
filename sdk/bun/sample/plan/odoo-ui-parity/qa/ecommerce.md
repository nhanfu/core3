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
QA slot: wave-3 ecommerce assignment (one QA mapped to up to three developers)
Module owner: ecommerce module owner
Verification trigger: feature-complete
Candidate commit: `c930aeb1`

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
| ECOMMERCE-FUNC-002 | Categories page/API, deterministic data and permissioned CRUD contracts | `bun test ./test/ecommerce_categories.integration.test.ts` — 2 tests, 7 assertions | pass |
| ECOMMERCE-FUNC-003 | Orders list/API, deterministic search/status/empty contracts | `bun test ./test/ecommerce_orders.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-FUNC-004 | Order detail form/API, persisted read and not-found contract | Same focused Orders test — 2 tests, 13 assertions | pass |
| ECOMMERCE-FUNC-005 | Unpaid Orders list/API and unpaid-state filter | `bun test ./test/ecommerce_unpaid_orders.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-FUNC-006 | Abandoned Carts list/API and deterministic read boundary | `bun test ./test/ecommerce_abandoned_carts.integration.test.ts` — 2 tests, 9 assertions | pass |
| ECOMMERCE-FUNC-007 | Customers list/API, summary data and order navigation | `bun test ./test/ecommerce_customers.integration.test.ts` — 2 tests, 8 assertions | pass |
| ECOMMERCE-FUNC-008 | Cart summary/lines, totals, navigation and quantity guard | `bun test ./test/ecommerce_cart.integration.test.ts` — 2 tests, 8 assertions; cart price-list validation rejects a pricelist from the authenticated actor's other company | pass |
| ECOMMERCE-FUNC-009 | Shop page/API, published-product visibility and cart navigation contract | `bun test ./test/ecommerce_shop.integration.test.ts` — 3 tests, 25 assertions; public operation query and route return only active/published catalog rows; authenticated add/repeat-add and anonymous cookie-cart add/repeat persistence are covered; mobile browser API journey captured at `/tmp/core3-odoo-parity/ecommerce-checkout-20260913/anonymous-cart-mobile.png` with catalog/add/repeat/cart responses 200 | pass for service/API and unauthenticated mobile browser journey; guest checkout handoff remains open |
| ECOMMERCE-FUNC-014 | Product catalog import and export affordance | `bun test ./test/ecommerce_products.integration.test.ts` — 2 tests, 22 assertions; `bun run audit` passes with 659 pages, 669 routes, and 1134 datasources; import validates `Name|Internal Reference|Sales Price` rows and persists products; ListView exposes shared export controls | pass for YAML import and shared export contract; authenticated browser interaction remains open |
| ECOMMERCE-PERM-014 | Public catalog and anonymous cart boundary | Shop test plus mobile browser API journey — public route verifies GET/search, rejects unsupported methods, validates a cookie-scoped cart ID, rejects customer-owned carts, and returns the same anonymous cart through the public cart operation | pass for public catalog and anonymous-cart isolation; guest checkout identity remains open |
| ECOMMERCE-WF-015 | Authenticated add-to-cart lifecycle | Same Shop test — token-derived customer cart is selected, product line is persisted, and repeated add increments quantity | pass for add/repeat-add; removal is covered by ECOMMERCE-WF-016 |
| ECOMMERCE-WF-016 | Cart line removal and total recalculation | `bun test ./test/ecommerce_cart.integration.test.ts` — 2 tests, 15 assertions; guarded delete removes the line, updates cart version, and recalculates persisted projection from 285 USD to 249 USD | pass for removal/total projection; price-list selection is covered by ECOMMERCE-WF-017 |
| ECOMMERCE-WF-017 | Cart price-list recalculation | Cart test — applies the retail price list to the authenticated owned cart, persists `pricelist_id`, recalculates the chair line from 249 USD to 229 USD, and increments line versions; isolated authenticated Chrome captures at `/tmp/core3-odoo-parity/ecommerce-checkout-20260913/desktop-cart-pricelist.png` and `mobile-cart-pricelist.png` selected `Retail Customers` and changed the visible total from 285 to 265 | pass at service/API and authenticated desktop/mobile browser interaction level; duplicate route-refresh requests were `ERR_ABORTED` by navigation cancellation, with the completed page/API response 200; paired Odoo comparison remains open |
| ECOMMERCE-WF-018 | Anonymous cart persistence | Shop test plus `/tmp/core3-odoo-parity/ecommerce-checkout-20260913/anonymous-cart-mobile.png` — public POST creates a `ecommerce-cart-anon-*` cookie cart, repeated mutation reuses it and increments quantity 1 → 2, GET returns persisted total 36, and customer-owned cart IDs are rejected | pass at service/API and unauthenticated mobile browser level; guest checkout and paired Odoo comparison remain open |
| ECOMMERCE-FUNC-010 | Product detail page/API, persisted read, guarded edit, stale and duplicate-reference boundaries | `bun test ./test/ecommerce_product_detail.integration.test.ts` — 2 tests, 9 assertions | pass |
| ECOMMERCE-FUNC-013 | Product image asset upload/download and metadata persistence | `bun test ./test/ecommerce_product_detail.integration.test.ts` — 5 tests, 28 assertions; multipart upload writes the file, inserts metadata, exact bytes remain downloadable after DuckDB restart, and product detail binds the attachment actions | pass for persisted/restart image path; catalog import/export remains pending |
| ECOMMERCE-UI-001 | Authenticated product image manager | Single-module server `:4312` + authenticated headless browser at 390x844; opened Core3 Ceramic Mug detail, expanded Product images, uploaded `browser-product.svg`, preview loaded successfully, and there were no HTTP or page errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/ecommerce-product-asset-mobile.png`; paired Odoo comparison pending |
| ECOMMERCE-FUNC-011 | Checkout validation, persisted order/line creation, cart conversion, and repeat-checkout guard | `bun test ./test/ecommerce_checkout.integration.test.ts` — 6 tests, 39 assertions; authenticated durable runner created `WEB/2026/0004`, stopped, restarted, and returned it from `/api/query`; unauthenticated mobile browser/API created a guest order with `customer_id = NULL`, converted the cart, and cleared the cookie | pass at service, API-handler, authenticated browser, guest browser/API, and restart level; external payment remains open |
| ECOMMERCE-FUNC-012 | Migration rerun/idempotency and wrong-company isolation for catalog and commerce records | Same focused Checkout test — 4 tests, 22 assertions | pass at service level |
| ECOMMERCE-PERM-013 | Authenticated customer ownership cannot be bypassed with caller-supplied customer/cart IDs | `bun test ./test/ecommerce_checkout.integration.test.ts` — 5 tests, 27 assertions; authenticated query ignores another customer ID and checkout mutation rejects a foreign cart with `ECOMMERCE_CHECKOUT_OWNERSHIP_REQUIRED` | pass for API-handler read/mutation boundary; wrong-company matrix remains pending |
| ECOMMERCE-PERM-015 | Authenticated company scope cannot be widened by caller-supplied company filters | `bun test ./test/ecommerce_checkout.integration.test.ts` — 6 tests, 35 assertions; HTTP query derives `company_name` from the authenticated profile for non-admin users, and a submitted `Other Company` filter still returns only the profile company | pass for HTTP query boundary; authenticated browser actor matrix and paired Odoo comparison remain open |
| ECOMMERCE-PERM-016 | Catalog writes cannot target another company | `bun test ./test/ecommerce_products.integration.test.ts` — 2 tests, 22 assertions; product import rejects an `Other Company` actor context writing a `My Company` product with `ECOMMERCE_COMPANY_SCOPE_REQUIRED` | pass for YAML mutation boundary; authenticated browser actor matrix remains open |
| ECOMMERCE-PERM-017 | Pricelist and cart mutations cannot cross company scope | `bun test ./test/ecommerce_pricelists.integration.test.ts ./test/ecommerce_cart.integration.test.ts` — 4 tests, 31 assertions; pricelist creation and cart repricing reject cross-company targets | pass for YAML mutation boundary; authenticated browser actor matrix remains open |
| ECOMMERCE-SCOPE-001 | Manifest-to-page/API coverage | Current implementation covers all 9 registered Ecommerce routes plus linked Product detail and Checkout routes | pass for route coverage; browser journey pending |

| ECOMMERCE-WF-019 | Guest checkout handoff | Checkout test plus unauthenticated mobile browser/API flow — validates guest identity and delivery/payment fields, copies anonymous cart lines into an order with `customer_id = NULL`, converts the cart, rejects repeat checkout, and clears the cart cookie | pass at service/API and unauthenticated browser/API level; external payment/delivery callbacks and paired Odoo comparison remain open |
| ECOMMERCE-WF-020 | Catalog publication visibility | Product editor test toggles the seeded unpublished service into the public catalog and back, persists versions 1 → 3, and rejects stale replay with 409 | pass at service/API level; authenticated browser workflow and paired Odoo comparison remain open |
| ECOMMERCE-WF-021 | Payment/delivery durable boundary contract | YAML contract test plus Bun runtime smoke: SDK `1.23.0` worker reached `RUNNING`, workflow returned `Authorized/Ready`, timer recovery completed across worker restart, payment/delivery signals were accepted through the Bun callback client, callback activity deduplication passed, and shutdown reached `STOPPED` against temporary Temporal Server `1.31.2`; checkout contract suite 8 tests, 43 assertions | pass for Bun startup, workflow execution, timer recovery, callback delivery/deduplication, and shutdown; provider retry and compensation failure-path evidence remains open |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| ECOMMERCE-UI-001 | Checkout route smoke initially lacked a visible Confirm Order action and did not carry cart context into the form | `8dd5f55` plus `12b03e67` | Authenticated desktop/mobile retest reached the form; desktop submission converted the cart with no console/request failures | pass for current Core3 flow; paired Odoo comparison blocked by missing installed `website_sale` |

## Sign-off

- Functional: service-level checkout and authenticated Core3 submit path pass
- Permissions: service-level company/customer boundaries pass; authenticated actor matrix pending
- Persistence/data integrity: checkout, migration rerun, and isolated durable restart pass
- Desktop/mobile visual parity: Core3 evidence pass; paired Odoo blocked (`/shop` 404)
- Tester decision: not signed off
