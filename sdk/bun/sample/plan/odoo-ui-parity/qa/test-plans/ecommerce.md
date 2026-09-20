# Ecommerce detailed QA test plan

Module: ecommerce  
QA owner: ecommerce-qa  
Developer owner: ecommerce module owner  
Reference addon/version: website_sale, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`ecommerce.md`](../../ecommerce.md); executed evidence is
recorded in [`../ecommerce.md`](../ecommerce.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Products/shop | product and shop routes | Published catalog, product detail, search/filter and price-list scope |
| Pricelists | pricelist list/detail routes | Pricelist CRUD, rules, validation and company scope |
| Commerce journey | shop/cart/checkout/payment/order routes when enabled | Product selection, cart, delivery/payment and order creation; currently a required expansion gate |
| YAML-driven presentation | page/API fragments and shared HTML components | `page.id` joins, Fluent `html.js` rendering, asset binding and responsive layout |

Actors are Ecommerce Manager, catalog editor, public visitor, authenticated
customer, wrong-company user and unauthenticated user. Fixtures use stable
published/unpublished products, variants, prices, pricelists, customers,
cart lines and orders. Public queries must exclude unpublished records;
mutations use isolated databases and deterministic IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| ECOM-FUNC-001 | Products | Search/filter/detail, published visibility, CRUD validation and stale guards use persisted catalog data | pass: focused suite; product detail edit boundary added |
| ECOM-FUNC-002 | Pricelists | List/detail, rule validation, duplicate/missing guards and manager writes persist | pass: focused suite |
| ECOM-FUNC-003 | Orders | Order list/detail, search/status filters, deterministic rows, read-only form and not-found boundary work | pass: focused suite |
| ECOM-FUNC-004 | Unpaid Orders | Unpaid list filters persisted orders and reuses the guarded read-only order detail route | pass: focused suite |
| ECOM-FUNC-005 | Abandoned Carts | Abandoned cart list, deterministic search/empty states and read-only detail navigation work | pass: focused suite |
| ECOM-FUNC-006 | Customers | Customer summary list, search/filter, deterministic data and order navigation work | pass: focused suite |
| ECOM-FUNC-007 | Cart | Persisted cart summary/lines, totals, product navigation and guarded quantity validation work | pass: focused suite and authenticated customer add-to-cart persistence; browser workflow planned |
| ECOM-FUNC-008 | Shop | Public/product selection and add-to-cart route contract exposes only published products and navigates to the cart | pass: authenticated page contract, public catalog API, persisted authenticated add-to-cart, and cookie-scoped anonymous cart API |
| ECOM-FUNC-009 | Checkout/order mutations | Customer, delivery, payment and order creation validate, copy cart lines, close the cart, and persist atomically | pass: focused service suite, authenticated and guest browser/API flows, and durable restart verification |
| ECOM-FUNC-010 | Categories | Category list, search/filter, deterministic hierarchy and permissioned create/archive/restore contracts work | pass: focused suite |
| ECOM-FUNC-011 | Empty/error/not-found | Empty, unavailable, missing, forbidden and transport-error states are explicit | pass at contract level |
| ECOM-FUNC-012 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate products, prices, categories, carts, customers or orders | pass: focused idempotency suite; durable order restart verified on isolated DuckDB |
| ECOM-FUNC-013 | Assets/import/export/print | Exercise product images/assets, catalog import/export and exposed print actions | product image upload/download and product import pass through the persisted YAML/API path; list export remains a client-side browser gate |
| ECOM-FUNC-014 | Sales handoff outbox | Checkout emits one idempotent handoff envelope; a Sales worker can claim it once, read the owned order/lines, and acknowledge success/failure with stale-write protection | pass: `ecommerce_checkout.integration.test.ts` — 11 tests, 59 assertions; migration, pending/order/line operations, claim, acknowledgement, duplicate-claim, and duplicate-acknowledgement behavior verified |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| ECOM-WF-001 | Catalog publication | Draft/unpublished → published → unpublished updates public visibility and version atomically | pass: `ecommerce_product_detail.integration.test.ts`; browser publication workflow remains planned |
| ECOM-WF-002 | Cart lifecycle | Add → update quantity → remove preserves price-list rules and totals | authenticated add/repeat-add/remove and retail price-list recalculation pass; anonymous add/repeat-add persistence is covered by ECOM-WF-006 |
| ECOM-WF-006 | Anonymous cart | Public visitor adds a published product without authentication and can retrieve the same cart through its cookie | pass: public route contract, persisted anonymous mutation, and mobile browser API journey; guest checkout handoff remains planned |
| ECOM-WF-003 | Checkout | Cart → customer/address → delivery/payment → order confirms without partial writes | pass: authenticated and guest service mutations plus unauthenticated browser guest checkout conversion; third-party payment integration remains planned |
| ECOM-WF-004 | Sales integration | Created web order resolves customer/product references through owning services | bounded handoff outbox now persists the eCommerce order envelope and exposes order/line reads for the owning Sales consumer; Sales-side consumer remains a separate gate |
| ECOM-WF-005 | Durable/external boundary | Payment, delivery, email, callbacks and cross-module commerce workflows use Temporal when durable; retry, replay, restart and compensation are tested | Temporal SDK 1.23.0 and Bun worker startup/workflow/timer-recovery/callback/retry-exhaustion/compensation/shutdown smoke pass; production provider adapter and paired Odoo comparison remain open |
| ECOM-WF-022 | Reorder prior order | An accessible prior order merges active product lines and quantities into the customer's open cart; unavailable-only orders are rejected | pass: `test/ecommerce_reorder.integration.test.ts` — ownership/company, stale/missing, additive repeat, and restart persistence coverage |

## Permission and security cases

The API transport injects `current_user_email` and `customer_scope` from the
authenticated token. Ecommerce customer/cart/order queries and checkout/cart
line mutations must use that context; a submitted `customer_id` is only a
narrowing filter and cannot substitute another customer. Admin users retain
the all-customer scope.

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| ECOM-PERM-001 | Ecommerce Manager/editor | Catalog and pricelist mutations succeed according to role | pass at contract level; browser actor planned |
| ECOM-PERM-002 | Public visitor | Only published catalog data is visible; cart/customer data is isolated | pass: public shop and cookie-scoped anonymous cart contract; customer ownership remains covered by ECOM-PERM-003 |
| ECOM-PERM-003 | Authenticated customer | Own cart/order and checkout data only; other customers are denied | pass: YAML service/mutation contract; HTTP actor coverage remains planned |
| ECOM-PERM-004 | Wrong company | Products, prices, carts and orders are not leaked or mutable | pass at service-query level and HTTP query context for authenticated customer company scope; authenticated browser actor test remains open |
| ECOM-PERM-005 | Unauthenticated/expired | Private routes redirect/401/403 without protected data | planned |
| ECOM-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current product/pricelist/cart/order unchanged | pass at contract level |
| ECOM-PERM-018 | Reorder ownership/company | A customer cannot reorder another customer's or company's order | pass: reorder integration guard matrix |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| ECOM-UI-001 | Shop/product/product-detail/pricelist/categories/orders/unpaid/abandoned/customers | 1440x900, 390x844 | Catalog cards, product detail, category/order/customer lists, unpaid/abandoned filters, prices, controls and responsive layout match Odoo | planned paired capture |
| ECOM-UI-002 | Cart/checkout/payment | both | Cart summary, checkout steps, validation and payment states match Odoo | authenticated route smoke passed; submit interaction and paired Odoo capture planned |
| ECOM-UI-003 | Empty/unpublished/error | both | Public visibility, empty and error states do not leak content or overflow | planned |
| ECOM-UI-004 | Current route regression | all manifest-owned Ecommerce routes | Public/authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |

## Reference blocker

The current authenticated Odoo reference has no Website/eCommerce app in its
launcher and `/shop` returns 404. Odoo paired cases remain blocked until a
database with the `website_sale` addon installed is supplied; this does not
waive Core3 functional, permission, persistence, or browser gates.

## Exit criteria

Full Ecommerce sign-off requires the focused catalog suite, authenticated and
public shop/cart/checkout workflows, all actor/company boundaries,
reload/restart persistence, Fluent HTML/assets validation, and paired Odoo
desktop/mobile comparisons. Current products/pricelists evidence is not
module completion.
