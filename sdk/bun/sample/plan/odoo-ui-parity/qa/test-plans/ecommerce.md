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
| ECOM-FUNC-001 | Products | Search/filter/detail, published visibility, CRUD validation and stale guards use persisted catalog data | pass: focused suite |
| ECOM-FUNC-002 | Pricelists | List/detail, rule validation, duplicate/missing guards and manager writes persist | pass: focused suite |
| ECOM-FUNC-003 | Orders | Order list, search/status filters, deterministic rows and read-only navigation contract work | pass: focused suite; detail browser pending |
| ECOM-FUNC-004 | Shop/cart | Product selection, cart add/update/remove and totals persist across reload | planned expansion |
| ECOM-FUNC-005 | Checkout/order mutations | Customer, delivery, payment and order creation validate and persist atomically | planned expansion |
| ECOM-FUNC-006 | Categories | Category list, search/filter, deterministic hierarchy and permissioned create/archive/restore contracts work | pass: focused suite |
| ECOM-FUNC-007 | Empty/error/not-found | Empty, unavailable, missing, forbidden and transport-error states are explicit | pass at contract level |
| ECOM-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate products, prices, categories or orders | planned restart/migration gate |
| ECOM-FUNC-009 | Assets/import/export/print | Exercise product images/assets, catalog import/export and exposed print actions | planned browser interaction gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| ECOM-WF-001 | Catalog publication | Draft/unpublished → published → unpublished updates public visibility and version atomically | planned browser workflow |
| ECOM-WF-002 | Cart lifecycle | Add → update quantity → remove preserves price-list rules and totals | planned expansion |
| ECOM-WF-003 | Checkout | Cart → customer/address → delivery/payment → order confirms without partial writes | planned expansion |
| ECOM-WF-004 | Sales integration | Created web order resolves customer/product references through owning services | planned integration gate |
| ECOM-WF-005 | Durable/external boundary | Payment, delivery, email, callbacks and cross-module commerce workflows use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| ECOM-PERM-001 | Ecommerce Manager/editor | Catalog and pricelist mutations succeed according to role | pass at contract level; browser actor planned |
| ECOM-PERM-002 | Public visitor | Only published catalog data is visible; cart/customer data is isolated | planned |
| ECOM-PERM-003 | Authenticated customer | Own cart/order and checkout data only; other customers are denied | planned |
| ECOM-PERM-004 | Wrong company | Products, prices, carts and orders are not leaked or mutable | planned |
| ECOM-PERM-005 | Unauthenticated/expired | Private routes redirect/401/403 without protected data | planned |
| ECOM-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current product/pricelist/cart/order unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| ECOM-UI-001 | Shop/product/pricelist/categories/orders | 1440x900, 390x844 | Catalog cards, product detail, category/order lists, prices, controls and responsive layout match Odoo | planned paired capture |
| ECOM-UI-002 | Cart/checkout/payment | both | Cart summary, checkout steps, validation and payment states match Odoo | planned expansion |
| ECOM-UI-003 | Empty/unpublished/error | both | Public visibility, empty and error states do not leak content or overflow | planned |
| ECOM-UI-004 | Current route regression | all manifest-owned Ecommerce routes | Public/authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |

## Exit criteria

Full Ecommerce sign-off requires the focused catalog suite, authenticated and
public shop/cart/checkout workflows, all actor/company boundaries,
reload/restart persistence, Fluent HTML/assets validation, and paired Odoo
desktop/mobile comparisons. Current products/pricelists evidence is not
module completion.
