# ecommerce parity progress

Module owner: ecommerce module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Latest Wave 41 bounded slice: `ECOM-CATALOG-PRODUCT-EXTRA-FIELDS-001`
(committed locally; not pushed).
Latest Wave 40 bounded slice: `ECOM-CATALOG-SHOP-GRID-GAP-001`
(committed locally; not pushed).
Latest Wave 39 bounded slice: `ECOM-CATALOG-SHOP-PAGE-SIZE-001`
(committed locally; not pushed).
Latest Wave 38 bounded slice: `ECOM-CATALOG-SHOP-GRID-COLUMNS-001`
(committed locally; not pushed).
Latest Wave 37 bounded slice: `ECOM-CATALOG-SHOP-PAGE-CONTAINER-001`
(committed locally; not pushed).
Latest Wave 36 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-CONTAINER-001`
(committed and pushed as `8514fadf`).
Latest Wave 35 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-COLUMNS-ORDER-001`
(committed locally as `f88b6af4`; not pushed).
Latest Wave 34 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-ROUNDNESS-001`
(committed as `67258341` in the current synchronized base).
Latest Wave 33 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-SPACING-001`
(committed as `98aaaccc` in the current synchronized base).
Latest Wave 32 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-WIDTH-001`
(committed locally as `726521e9`; pushed in the current synchronized base).
Latest Wave 31 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-LAYOUT-001`
(committed locally as `a79b02c9`; pushed in the current synchronized base).
Latest Wave 30 bounded slice: `ECOM-CATALOG-PRODUCT-DOCUMENT-URL-001`
(committed locally as `c4930038`; pushed in the current synchronized base).
Latest committed bounded slice: `ECOM-CATALOG-SHOP-PAGE-CONTAINER-001`
(local and not pushed).
Latest Wave 29 bounded slice: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-RATIO-001`
(committed locally as `18450233`; not pushed).
The prior add-to-cart redirect commit remains
`d63f86dbba63048508ef3792f48fd195eebd81a1`.

Wave 41 verification: the focused suite passes **2 tests and 35 assertions**;
the Product Detail/Products/Shop regression passes **12 tests and 110
assertions**. `bun run audit` passes at **756 pages, 765 routes, and 1534
datasources**; scoped ESLint and `git diff --check` pass. The suite covers Odoo settings/model/template comparison, separate
page/API YAML, deterministic ordered fixtures, permissioned CRUD, supported
field and sequence validation, company/missing/duplicate/stale guards,
Product Detail projection, migration replay, and DuckDB restart persistence.
Core3 desktop/mobile capture is runtime-blocked and Odoo `/shop` remains an
exact HTTP 404 blocker. Ecommerce module sign-off remains open.

Wave 40 verification: the focused suite passes 2 tests and 30 assertions; the
Shop-focused regression passes 14 tests and 160 assertions. The UI audit
passes at 755 pages, 764 routes, and 1528 datasources; scoped ESLint and
`git diff --check` pass. The suite covers Odoo model/builder comparison, separate page/API YAML,
the suite covers Odoo model/builder comparison, separate page/API YAML,
deterministic options and fixture, missing-record read behavior, permissioned
CRUD, company/invalid/stale guards, Shop projection, replay safety, and DuckDB
restart persistence. Core3 desktop/mobile capture is blocked by unavailable
ports 3000/4312/4313 and no persistent browser runtime; Odoo `/shop` is exact
HTTP 404 on ports 8069 and 8073. Ecommerce module sign-off remains open.

Wave 39 verification: the focused suite passes 2 tests and 26 assertions; the
Shop-focused regression passes 12 tests and 130 assertions. The UI audit
passes at 754 pages, 763 routes, and 1522 datasources; scoped ESLint and
`git diff --check` pass. The suite covers Odoo model/builder comparison, separate page/API YAML,
the suite covers Odoo model/builder comparison, separate page/API YAML,
deterministic fixture, missing-record read behavior, permissioned CRUD,
company/invalid/stale guards, Shop projection, replay safety, and DuckDB
restart persistence. Core3 desktop/mobile capture is blocked by unavailable
ports 3000/4312/4313 and no persistent browser runtime; Odoo `/shop` is exact
HTTP 404 on ports 8069 and 8073. Ecommerce module sign-off remains open.

Wave 38 verification: the focused suite passes 2 tests and 26 assertions; the
Shop-focused regression passes 10 tests and 104 assertions. The UI audit
passes at 753 pages, 762 routes, and 1519 datasources; scoped ESLint and
`git diff --check` pass. The focused suite covers Odoo source/plugin/template comparison, separate page/API
the suite covers Odoo source/plugin/template comparison, separate page/API
YAML, deterministic options and fixture, missing-record read behavior,
permissioned CRUD, company/invalid/stale guards, Shop projection, replay
safety, and DuckDB restart persistence. Core3 desktop/mobile capture is
blocked by unavailable ports 3000/4312/4313 and no persistent browser
runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and 8073. Ecommerce
module sign-off remains open.

Wave 37 verification: the focused suite passes 2 tests and 24 assertions; the
bounded regression passes 24 tests and 253 assertions. Scoped ESLint and
`git diff --check` pass. The global UI audit is currently blocked by an
unrelated unstaged Employees page action (`actions[11].title` and
`actions[11].fields` are not allowed); no non-Ecommerce file was changed to
repair that boundary. The Shop page-container suite preserves the existing Shop product datasource
contract while covering Odoo source comparison, separate page/API YAML,
permissioned CRUD, company/invalid/stale guards, Shop projection, migration
replay, idempotent fixture loading, and DuckDB restart persistence. Core3
desktop/mobile capture is blocked by unavailable ports 3000/4312/4313 and no
persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and
8073. Ecommerce module sign-off remains open.

Wave 36 verification: the focused suite passes 2 tests and 25 assertions; the
container plus prior columns-order, image policy, and Product Detail
regression passes 19 tests and 204 assertions. The UI audit passes at 749
pages, 758 routes, and 1499 datasources; scoped ESLint and diff checks pass.
Core3 desktop/mobile capture is blocked by unavailable ports 3000/4312/4313
and no persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports
8069 and 8073. This bounded slice is not module sign-off.

## Current bounded task — `ECOM-CATALOG-PRODUCT-PAGE-COLUMNS-ORDER-001`

Wave 35 selected Odoo Website Sale's two-value product-page main columns
order setting. Migrations 134/135 add the durable company policy and fixture;
separate policy page/API YAML provides the supported options, permissioned
optimistic update, validation, and company isolation. Product Detail reads the
effective company order and displays it. Focused source, contract, CRUD,
invalid/foreign/stale, projection, replay, and restart tests pass; the
columns-order plus prior image policy and Product Detail regression passes 17
tests and 179 assertions. The UI audit passes at 748 pages, 757 routes, and
1493 datasources; scoped ESLint and diff checks pass. Core3 desktop/mobile
capture is blocked by unavailable ports 3000/4312/4313 and no persistent
browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and 8073. This
bounded slice is not module sign-off; the implementation commit will be
implementation commit: `f88b6af4` (local and not pushed).

## Current bounded task — `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-SPACING-001`

Wave 33 selected Odoo Website Sale's four-value product image spacing setting.
Migrations 130/131 add the durable company policy and fixture; separate
policy page/API YAML provides the supported options, permissioned optimistic
update, validation, and company isolation. Product Detail reads the effective
company spacing and displays it. Focused source, contract, CRUD,
invalid/foreign/stale, projection, replay, and restart tests pass; the
image-spacing plus prior image policy and Product Detail regression passes
13 tests and 129 assertions. The UI audit passes at 744 pages, 753 routes,
and 1478 datasources; scoped ESLint and diff checks pass. Core3
desktop/mobile capture is blocked by unavailable ports 3000/4312/4313 and no
persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and
8073. This bounded slice is not module sign-off; the implementation commit
will be recorded here after local commit.

Wave 34 verification: the focused suite passes 2 tests and 26 assertions; the
roundness plus prior image policy and Product Detail regression passes 15 tests
and 155 assertions. The UI audit passes at 747 pages, 756 routes, and 1490
datasources; scoped ESLint and diff checks pass. Core3 desktop/mobile capture
is blocked by unavailable ports 3000/4312/4313 and no persistent browser
runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and 8073. This bounded
slice is not module sign-off; implementation commit: `2cc62edd` (local and
not pushed).

## Current bounded task — `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-WIDTH-001`

Wave 32 selected Odoo Website Sale's five-value product image width setting.
Migrations 128/129 add the durable company policy and fixture; separate
policy page/API YAML provides the supported options, permissioned optimistic
update, validation, and company isolation. Product Detail reads the effective
company width and displays it. Focused source, contract, CRUD,
invalid/foreign/stale, projection, replay, and restart tests pass. Core3
desktop/mobile capture is blocked by unavailable ports 3000/4312/4313 and no
persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and
8073. This bounded slice is not module sign-off.

## Current bounded task — `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-LAYOUT-001`

Wave 31 selected Odoo Website Sale's Carousel/Grid product image layout.
Migrations 126/127 add the durable company policy and fixture; separate
policy page/API YAML provides the supported options, permissioned optimistic
update, validation, and company isolation. Product Detail reads the effective
company layout and displays it. Focused source, contract, CRUD,
invalid/foreign/stale, projection, replay, and restart tests pass. Core3
desktop/mobile capture is blocked by unavailable ports 3000/4312/4313 and no
persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and
8073. This bounded slice is not module sign-off; the implementation commit
will be recorded here after local commit.

## Current bounded task — `ECOM-CATALOG-PRODUCT-DOCUMENT-URL-001`

Wave 30 selected the open Odoo Website Sale URL-backed product-document
workflow. Migrations 124/125 add durable document type/URL state and a
deterministic published fixture. The existing separate document page/API now
offers permissioned optimistic URL assignment with absolute HTTP/HTTPS
validation; file upload clears URL state. Product Detail exposes both kinds,
and the public Ecommerce operation/route validates the product, publication,
company, and document relation before redirecting to the external URL.
Focused source, contract, CRUD, invalid/foreign/stale, public-route, replay,
and restart tests pass; the existing document suite remains green. Core3
desktop/mobile capture is blocked by unavailable ports 3000/4312/4313 and no
persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and
8073. This bounded slice is not module sign-off; the implementation commit
will be recorded here after local commit.

## Current bounded task — `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-RATIO-001`

Wave 29 selected Odoo Website Sale's desktop/mobile product image-ratio
settings. Migrations 122/123 add the durable company policy and fixture;
separate policy page/API YAML provides supported ratio options, permissioned
optimistic updates, validation, and company isolation. Product Detail reads
the effective policy and displays both desktop and mobile values. Focused
source, contract, CRUD, invalid/foreign/stale, replay, projection, and
restart tests pass. The focused Product Detail regression passes; the Products
regression retains an unrelated existing discovery-schema failure. Core3
desktop/mobile capture is blocked by unavailable ports 3000/4312/4313 and no
persistent browser runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and
8073. This bounded slice is not module sign-off; the implementation commit
will be recorded here after local commit.

## Current bounded task — `ECOM-CATALOG-ECOMMERCE-ACCESS-001`

Wave 28 selected Odoo Website Sale's `ecommerce_access` policy: All users or
Logged in users. Migrations 120/121 add the durable company policy and fixture;
separate policy page/API YAML provides permissioned optimistic updates. The
public Ecommerce route boundary, shop operation, and anonymous add-to-cart
contract enforce logged-in visibility, while authenticated access and
idempotent cart addition remain available. Focused source/contract, validation,
public-route, shop, replay, and restart tests pass. Core3 browser capture is
blocked by unavailable ports 3000/4312/4313 and missing persistent browser
runtime; Odoo `/shop` is exact HTTP 404 on ports 8069 and 8073. The bounded
slice is verified but not module sign-off; implementation commit:
`841fd0fe` (local only, not pushed).

## Current bounded task — `ECOM-CHECKOUT-ORDER-ASSIGNMENT-001`

Wave 27 selected Odoo Website Sale's Orders Assignment settings: durable
website Sales Team and Salesperson defaults used by online orders. Migrations
118/119 add company-scoped policy/options and deterministic fixtures; separate
policy page/API YAML provides permissioned optimistic updates with active
company validation. Authenticated and guest checkout snapshot the selected
assignment on orders and the existing Sales handoff, with idempotent retry
boundaries. Focused source, contract, validation, checkout, handoff, replay,
and restart tests pass. Core3 browser capture is blocked by unavailable ports
3000/4312/4313 and missing persistent browser runtime; Odoo `/shop` is exact
HTTP 404 on ports 8069 and 8073. The bounded slice is verified but not module
sign-off; implementation commit: `90a3b38b` (local only, not pushed).

## Current bounded task — `ECOM-CHECKOUT-ABANDONED-CART-RECOVERY-001`

Wave 26 selected Odoo Website Sale's abandoned-cart recovery workflow. Odoo's
website policy controls the recovery template, delay, and enablement; the
Abandoned Carts action can send a recovery email once, while the scheduler
marks eligible carts as sent. Core3 migrations 116/117 add the durable
company policy, recovery template fixture, abandoned-cart send ledger, and
company scope. Separate policy page/API YAML provides permissioned optimistic
updates; the Abandoned Carts page/API exposes recovery state and an
idempotent Send Recovery Email action.

The focused test covers Odoo source/menu/settings comparison, migration
replay, company/delay/template validation, policy CRUD, send enablement,
idempotency, stale concurrency, and DuckDB restart. Browser capture remains
blocked by the unavailable Core3 ports and missing persistent browser runtime;
Odoo `/shop` is an exact HTTP 404 on ports 8069 and 8073. Ecommerce module
sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-CONFIRMATION-EMAIL-TEMPLATE-001`

Wave 25 selected Odoo Website Sale's `confirmation_email_template_id`, which
was not represented in Core3. Odoo restricts the website setting to active
`sale.order` mail templates and Website Sale's order override uses the selected
template for confirmation. Core3 migrations 114/115 add the durable template
catalog, company policy, order snapshot columns, and deterministic fixtures.
Separate page/API YAML provides the permissioned configuration form and
optimistic update; authenticated and guest checkout snapshot the selected
template onto created orders, and order list/detail projections expose it.

The focused test covers Odoo source comparison, page/API pairing, migration
replay, template options, company and invalid-template rejection, optimistic
concurrency, checkout persistence, and DuckDB restart. Browser capture remains
blocked by the unavailable Core3 ports and missing persistent browser runtime;
Odoo `/shop` is an exact HTTP 404 on ports 8069 and 8073. Ecommerce module
sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-TAX-DISPLAY-MODE-001`

Wave 24 selected Odoo Website Sale's `show_line_subtotals_tax_selection`,
which was not represented in Core3. Odoo's website field and settings view
offer Tax Excluded and Tax Included modes, while the checkout templates use
the selected mode for line subtotal tax indication. Core3 migrations 112/113
add the company-scoped durable policy and deterministic Tax Excluded fixture.
Separate page/API YAML provides the permissioned form and optimistic update;
cart, checkout, and the public anonymous-cart operation expose the persisted
display mode and subtotal label.

The focused test covers Odoo source comparison, page/API pairing, migration
replay, CRUD, company and invalid-mode rejection, optimistic concurrency,
cart/checkout/public projection, and DuckDB restart persistence. Browser
capture remains blocked by the unavailable Core3 ports and missing persistent
browser runtime; Odoo `/shop` is an exact HTTP 404 on ports 8069 and 8073.
Ecommerce module sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-TRANSACTION-POST-PROCESS-001`

Wave 23 selected Odoo Payment Transaction post-processing, which was not
represented in Core3's existing status-transition action. Odoo exposes
`action_post_process` from the Website eCommerce Payment Transactions action;
the generic `_post_process` sets `is_post_processed` and the form hides the
button after completion. Core3 migrations 110/111 add the durable flag and
timestamp, API/page fields and action, explicit checkout defaults, and reset
on later state transitions.

Focused verification passed **3 tests, 29 assertions, 0 failures**; payment
transaction, checkout, and saved-token regression passed **22 tests, 136
assertions, 0 failures**. Scoped Ecommerce YAML validation, scoped ESLint,
and `git diff --check` passed; the repository UI audit passed at 726 pages,
735 routes, and 1409 datasources. Core3 authenticated desktop/mobile capture is blocked by missing
`js_repl` and unavailable ports 3000/4312/4313; Odoo `/shop` is an exact HTTP
404 on 8069/8073. Ecommerce module sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-ADD-TO-CART-REDIRECT-001`

Wave 22 selected Odoo Website Sale's `website.add_to_cart_action`, backed by
the `cart_redirect_setting`, website session, cart service, and `/shop/cart/add`
controller. Core3 migrations 108/109 add a company-scoped durable policy and
deterministic fixture. Separate page/API YAML provides the Configuration form,
mode options, permissioned optimistic update, and shop mutation redirect intent
for authenticated and anonymous carts.

Focused verification passed **3 tests, 31 assertions, 0 failures**; the Shop
regression plus the focused suite passed **6 tests, 56 assertions, 0 failures**.
Scoped Ecommerce YAML validation, scoped ESLint, and `git diff --check` passed;
the repository UI audit passed at 725 pages, 734 routes, and 1407 datasources.
Core3 authenticated desktop/mobile capture is blocked
by missing `js_repl` and unavailable ports 3000/4312/4313; Odoo `/shop` is an
exact HTTP 404 on 8069/8073. Ecommerce module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-ZERO-PRICE-SALE-POLICY-001`

Wave 21 selected Odoo Website Sale's zero-price sale policy, which is still
absent from Core3. Odoo's `prevent_zero_price_sale` setting hides Add to Cart
for zero-priced products and exposes a configurable Contact Us URL. Core3
migrations 106/107 add the durable company-scoped policy and deterministic
fixture. Separate page/API YAML provides permissioned optimistic updates and
safe URL validation; Shop projections expose contact-only state, while
authenticated and anonymous add-to-cart guards enforce the policy.

Focused verification passed **3 tests, 32 assertions, 0 failures**; Shop
regression plus the focused suite passed **6 tests, 57 assertions, 0
failures**. Scoped Ecommerce YAML validation, scoped ESLint, and
`git diff --check` are recorded with evidence. The full repository audit is
blocked by unrelated Inventory actions `print_inventory_transfer_operations`
and `print_inventory_transfer_delivery_slip` referenced without definitions.
Core3 authenticated
desktop/mobile capture is blocked by missing `js_repl` and unavailable ports
3000/4312/4313; Odoo `/shop` is exact HTTP 404 on 8069/8073. Ecommerce module
sign-off remains open.

## Current bounded task — `ECOM-CATALOG-SHOP-DEFAULT-SORT-001`

Wave 20 selected Odoo Website Sale's `website.shop_default_sort`, which is
still absent from Core3's hard-coded Featured shop ordering. Odoo's Website
Builder supports Featured, Newest Arrivals, Name (A-Z), Price - Low to High,
and Price - High to Low; Core3 migrations 104/105 add the durable
company-scoped policy and deterministic fixture. Separate page/API YAML
provides the mode catalog and `ecommerce.write` optimistic update; both the
authenticated Shop datasource and public shop operation honor the selected
order.

Focused verification passed **3 tests, 29 assertions, 0 failures**; the Shop
regression passed **3 tests, 25 assertions, 0 failures**. The adjacent full
Products test is blocked by an unrelated existing `pages/products.yaml`
schema error (`components[1].title is not allowed`); no other-owner file was
changed. Scoped Ecommerce YAML validation, scoped ESLint, and
`git diff --check` are recorded with evidence. Full `bun run audit` remains
blocked by that unrelated repository-wide schema error. Core3 authenticated
desktop/mobile capture is blocked by missing `js_repl` and unavailable ports
3000/4312/4313; Odoo `/shop` is exact HTTP 404 on 8069/8073.
Ecommerce module sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-ACCOUNT-POLICY-001`

Wave 19 selected Odoo Website Sale's `account_on_checkout` configuration,
backed by `website.account_on_checkout` and the checkout registration settings
view. Core3 migrations 102/103 add a company-scoped durable policy and
deterministic fixture. Separate page/API YAML exposes Optional, Disabled, and
Mandatory modes with `ecommerce.write` optimistic updates; the update keeps
Odoo's `auth_signup_uninvited` b2c/b2b mapping. Anonymous checkout is blocked
when Mandatory while authenticated customer checkout remains available.

Focused verification passed **3 tests, 27 assertions, 0 failures**; checkout,
shop, and product-detail regression passed **20 tests, 119 assertions, 0
failures**. Audit passed at **721 pages, 730 routes, 1396 datasources**;
scoped ESLint and `git diff --check` passed. Core3 authenticated desktop/mobile
capture is blocked by missing `js_repl` and unavailable ports 3000/4312/4313;
Odoo `/shop` is exact HTTP 404 on 8069/8073. Ecommerce module sign-off
remains open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-FEED-001`

Wave 18 selected Odoo Website Sale's Product Feed configuration and GMC XML
generation, a source-backed surface not covered by the excluded catalog and
checkout slices. Core3 migrations 100/101 add durable feed records with
company scope, generated access tokens, category/pricelist filters, cache XML,
and expiry. Product Feeds uses separate page/API YAML; create/edit/generate/
delete actions enforce Ecommerce permissions, supported target/language,
active selector references, duplicate names, company scope, optimistic
concurrency, cache invalidation, and token-checked public feed reads.

Focused verification passed **3 tests, 40 assertions, 0 failures**. The
focused Ecommerce regression, audit, scoped ESLint, and `git diff --check`
will be recorded with the local commit. Core3 authenticated desktop/mobile
capture is blocked by the unavailable persistent browser runtime and local
ports; Odoo `/shop` remains an exact HTTP 404 blocker. Ecommerce module
sign-off remains open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-WEBSITE-SEQUENCE-REORDER-001`

Wave 17 selected Odoo Website Sale's product website ordering workflow. Odoo
provides top/bottom/up/down methods and a Products list handle ordered by
`website_sequence`; Core3 previously exposed only a numeric field. Migrations
098/099 add the ordering index and deterministic fixtures. Products uses
separate page/API YAML with four permissioned reorder actions enforcing active
same-company scope, optimistic concurrency, edge handling, and restart-safe
persistence.

Focused verification passed **3 tests, 30 assertions, 0 failures**; the
Products/Product Detail/Shop regression passed **13 tests, 105 assertions, 0
failures** on rerun. Audit, scoped ESLint, and `git diff --check` passed.
Core3 authenticated desktop/mobile capture is blocked by missing `js_repl`
and unavailable local ports; Odoo `/shop` is exact HTTP 404 on 8069/8073.
Ecommerce module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-CATEGORY-ASSIGNMENT-001`

Wave 16 selected Odoo Website Sale's `product.template.public_categ_ids`
many-to-many Website Product Category relation. The Website Products action
renders and searches this relation; Core3 previously stored only one product
category string. Migrations 096/097 add durable assignment rows and
deterministic Mug/Chair fixtures. Product Detail uses separate page/API YAML
with assign/edit/remove actions enforcing active same-company categories,
duplicate and sequence validation, optimistic concurrency, and restart
persistence.

Focused verification passed **3 tests, 31 assertions, 0 failures**; the
Product Detail/Products/Categories/Shop regression passed **15 tests, 113
assertions, 0 failures**. Audit, scoped ESLint, and `git diff --check` passed.
Core3 authenticated desktop/mobile capture is blocked by missing `js_repl`
and unavailable local ports; Odoo `/shop` is exact HTTP 404 on 8069/8073.
Ecommerce module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-DISPLAY-DIMENSIONS-001`

Wave 15 selected Odoo Website Sale product display dimensions. Odoo persists
`website_size_x/y`, clamps them in the product grid, and writes them from the
Website editor. Core3 migrations 094/095 add durable columns and deterministic
Mug/Chair values. Products, Shop, and Product Detail use separate page/API
YAML; create/edit enforces 1–12 validation, current-company scope, optimistic
concurrency, and restart persistence.

Focused verification passed **3 tests, 31 assertions, 0 failures**, including
source tracing, paired schema validation, CRUD, invalid/company/stale guards,
migration replay, and restart persistence. Scoped audit, ESLint, and
`git diff --check` passed and are recorded with evidence. Core3 authenticated
desktop/mobile capture is blocked by missing `js_repl` and unavailable local
ports; Odoo `/shop` is exact HTTP 404 on 8069/8073. Ecommerce module sign-off
remains open.

## Current bounded task — `ECOM-CATALOG-CATEGORY-WEBSITE-DESCRIPTION-001`

Wave 14 selected the next genuinely uncovered Website Sale behavior: the
website description on `product.public.category`. Odoo exposes the HTML field
in the `product_public_category_action` form and renders it in the shop
category header. Core3 migrations 092/093 add durable category description
content and a deterministic Accessories fixture. Category Detail keeps
page/API YAML separate and exposes a permissioned rich-text edit/clear action
with active/current-company, safe-HTML/length, optimistic concurrency, and
DuckDB restart coverage.

Focused tests passed **3 tests, 21 assertions, 0 failures**. Category
description/cover/CRUD regression passed **8 tests, 59 assertions, 0
failures**. The UI audit passed at 714 pages/723 routes/1367 datasources;
scoped ESLint and `git diff --check` pass. Core3 desktop/mobile capture is
blocked by missing `js_repl` and unavailable ports 3000/4312/4313; Odoo
`/shop` is exact HTTP 404 on 8069/8073. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-category-website-description-001/`.
Committed locally as `2e117416fe241bd612356a2c8c472042f96f7e68`; not pushed.

## Current bounded task — `ECOM-CATALOG-PRODUCT-REVIEWS-001`

Wave 13 selected the next genuinely uncovered Website Sale behavior: product
reviews and ratings. Odoo `product.template` inherits `rating.mixin`, exposes
`rating_avg`/`rating_count`, and the product template renders Customer Reviews
through the portal message thread. Core3 migrations 090/091 add durable,
company-scoped review records and a deterministic published Mug fixture.
Product Detail keeps page/API YAML separate and now exposes published review
aggregates plus a permissioned create/edit/publish/reject/delete lifecycle.
Validation, company scope, optimistic concurrency, moderation reset, and
DuckDB restart persistence are covered.

Focused review tests passed **3 tests, 29 assertions, 0 failures**. Product
Detail/Shop/review focused regression passed **12 tests, 95 assertions**; the
Products companion test has one unrelated shared schema failure
(`actions[11].result is not allowed`). Product Detail paired schema validation,
the UI audit (714 pages/723 routes/1364 datasources), scoped ESLint, and
`git diff --check` pass. Core3 desktop/mobile capture is blocked by missing
`js_repl` and unavailable ports 3000/4312/4313; Odoo `/shop` is exact HTTP 404
on 8069/8073. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-reviews-001/`.
Committed locally as `099112b089627f3e008e3f30d70aae6f1a8cd9ae`; not pushed.

## Current bounded task — `ECOM-CATALOG-PRODUCT-PUBLICATION-001`

The eleventh-wave source-backed gap is Website Sale product publication. Odoo
products inherit `website.published.mixin`, persist `publish_date`, and flip
`website_published` through `website_publish_button`. Core3 migrations 086/087
add durable publication timestamps and deterministic published fixtures.
Products and Product Detail use separate page/API YAML; explicit publish and
unpublish actions enforce write permission, active/current-company scope, and
optimistic row versions while refreshing Shop visibility.

Focused verification is complete: **3 tests, 28 assertions, 0 failures**;
the adjacent Product Detail/Shop regression set passed **11 tests, 81
assertions, 0 failures**. Paired schema validation passed for 4 pairs, UI
audit passed at 710 pages/719 routes/1353 datasources, scoped ESLint and
`git diff --check` passed. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-publication-001/`.
Core3 desktop/mobile capture is blocked by unavailable browser runtime; Odoo
`/shop` is exact HTTP 404 on 8069/8073. Committed locally as
`eefbbb87c88dc22cafbdf7be720902b56b55b66d`; not pushed.

Commit boundary note: `eefbbb874a254bd5b1d235c39d29feed5b49ea41` is the
Ecommerce-only implementation/evidence commit for this wave. A concurrent
Inventory owner committed immediately afterward while this ledger hash was
being finalized; no Inventory paths are part of the Ecommerce implementation
commit.

## Current bounded task — `ECOM-CATALOG-PRODUCT-SEO-METADATA-001`

The next uncovered source-backed gap is Odoo's `website.seo.metadata` mixin
on products. It persists meta title, description, keywords, and OpenGraph
image values and computes `is_seo_optimized`; Website templates consume those
values for the document head. Core3 migrations 088/089 add durable fields and
a deterministic Mug fixture. Product Detail uses a separate page/API pair and
provides a permissioned SEO form with company, validation, optimistic
concurrency, and restart coverage.

Focused verification is complete: **3 tests, 22 assertions, 0 failures**;
the adjacent Product Detail/Products/Shop regression set passed **13 tests,
97 assertions, 0 failures**. Paired schema validation passed for 4 pairs, UI
audit passed at 710 pages/719 routes/1354 datasources, scoped ESLint and
`git diff --check` passed. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-seo-metadata-001/`.
Core3 desktop/mobile capture is blocked by unavailable browser runtime; Odoo
`/shop` is exact HTTP 404 on 8069/8073. Ready for the local Ecommerce-only
commit; not pushed.

## Current bounded task — `ECOM-CATALOG-CATEGORY-COVER-IMAGE-001`

The tenth-wave source-backed gap is Website Sale's
`product.public.category.cover_image`. Odoo exposes the image on the public
category model/view and updates it through the category image controller.
Core3 migrations 084/085 add durable company-scoped metadata and a
deterministic Accessories fixture. Category list and detail use paired,
separate page/API YAML; upload/replace, download, and remove are permissioned,
validated, company-aware, optimistic, and restart-safe.

Focused verification is complete: **5 tests, 38 assertions, 0 failures**
including category regression; paired schema validation passed for 2 pairs,
scoped ESLint and `git diff --check` passed. The repository UI audit is
blocked by an unrelated shared stale kanban/search page schema error; no
non-Ecommerce file was changed. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-category-cover-image-001/`.
Core3 desktop/mobile browser capture is blocked by unavailable ports and no
persistent `js_repl`; Odoo `/shop` is exact HTTP 404 on 8069/8073. Committed
locally as `ac45965a55653bf7e6a2277c6ccf530e25e45ee3`; not pushed.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-DOCUMENTS-001`

The next uncovered source-backed catalog behavior is Website Sale's product
document lifecycle. Odoo's `product.document` is an attachment-backed model;
Website Sale adds `shown_on_product_page`, the product-document list/form
toggle, and an active/template-owned public download route.

Core3 migrations 082/083 add durable product-template document metadata and a
deterministic Mug Care Guide. Product Detail and Product Document use separate
page/API YAML contracts. Create, upload/replace, download, publish toggle,
edit, and delete are guarded by Ecommerce permissions, current-company scope,
validation, and optimistic row versions; restart coverage proves bytes and
metadata survive DuckDB reopen.

Verification is complete for the bounded service/API slice: 3 focused tests,
33 assertions; adjacent Product Detail/Products regression is 10 tests, 83
assertions; paired schema validation, UI audit, scoped lint, and diff-check
pass. Core3 desktop/mobile browser capture is blocked by unavailable ports and
no persistent `js_repl`; Odoo `/shop` is HTTP 404 on 8069/8073. Evidence is
under `evidence/ecommerce/2026-09-21/ecom-catalog-product-documents-001/`.
Bounded commit: `26a872c6ab326dd2b10b5aeb911a6095e52ae6e1` (local only, not
pushed). Module sign-off, variant-specific documents, URL documents, and
paired Odoo evidence remain open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-WEBSITE-DESCRIPTION-001`

The next uncovered source-backed catalog behavior is Odoo Website Sale's
product `website_description`. Odoo stores HTML content on the product
template, includes it in description search, and renders it after the product
detail content.

Core3 migrations 080/081 add durable product website-description content with
a deterministic Mug fixture. Products, Shop, and Product Detail remain paired
through separate page/API YAML; the APIs expose the description and search it
with name/category, while Product Detail exposes a rich-text edit field.
Product writes enforce `ecommerce.write`, company scope, optimistic row
versions, a 10,000-character limit, and a script-tag rejection boundary.

Focused verification: `bun test
./test/ecommerce_product_website_description.integration.test.ts --timeout
20000` — **3 passed, 24 assertions, 0 failures**. The adjacent Product
Detail, Shop, Product Variants, Cart, and Compare-Price regression set passed
**17 tests, 129 assertions**; combined **20 tests, 153 assertions, 0
failures**. Paired Ecommerce page/API schema validation passed. The full UI
audit is blocked by an unrelated Timesheets schema error; scoped ESLint and
`git diff --check` passed. Runtime probes and Odoo `/shop` remain blocked.

## Current bounded task — `ECOM-CATALOG-PRODUCT-COMPARE-PRICE-001`

The next uncovered source-backed catalog behavior is Website Sale's
compare-at/list price. Odoo's `compare_list_price` is rendered as a
strikethrough candidate only when it exceeds the actual price, and the product
form exposes it through the Website Sale price-comparison group.

Core3 migrations 078/079 add durable product and variant compare prices with
deterministic Mug and Mug Blue values. Products, Shop, Product Detail, and
Product Variant remain paired through separate page/API YAML; each exposes the
raw value and a derived `compare_at_price` display boundary. Product editing
and the dedicated variant compare-price action enforce `ecommerce.write`,
company scope, non-negative values, and optimistic row versions.

Focused verification: `bun test
./test/ecommerce_product_compare_price.integration.test.ts --timeout 20000` —
**3 passed, 33 assertions, 0 failures**. The adjacent Products, Product
Detail, Product Variants, Shop, and Cart regression set passed **16 tests, 118
assertions**; combined **19 tests, 151 assertions, 0 failures**. UI audit
passed at 701 pages, 710 routes, and 1328 datasources. Scoped ESLint and
`git diff --check` passed. Runtime probes show Core3 ports
3000/4312/4313 unavailable and Odoo `/shop` returns exact HTTP 404 on 8069
and 8073; no browser sign-off is claimed.

## Current bounded task — `ECOM-CATALOG-VARIANT-BASE-UNIT-PRICING-001`

The next uncovered source-backed catalog behavior is Website Sale base-unit
pricing for variants. Odoo defines `base_unit_count`, custom `base_unit_id`,
derived `base_unit_price`, and `base_unit_name`; its combination response sends
the unit price, and the variant form exposes these fields. A zero count hides
the derived price.

Core3 migrations 076/077 add durable variant count/name metadata with a
deterministic Mug Blue fixture. Product Detail and Product Variant page/API
YAML remain separate; variant rows and the variant detail expose the derived
price, while a permissioned configuration action validates current company,
non-negative count, unit-name length, and optimistic row versions. The zero
count boundary is persisted and hides the calculated price.

Focused verification: `bun test
./test/ecommerce_variant_base_units.integration.test.ts --timeout 20000` —
**3 passed, 27 assertions, 0 failures**. Adjacent Product Variant, Product
Detail, and Cart tests passed **11 tests, 71 assertions, 0 failures**; the
bounded set passed **14 tests, 98 assertions, 0 failures**. The UI audit passed
at 699 pages, 708 routes, and 1321 datasources; scoped ESLint and
`git diff --check` passed. Authenticated Core3 desktop/mobile capture is
blocked by unavailable ports 3000/4312/4313; Odoo `/shop` returns exact HTTP
404 on ports 8069/8073. Browser actor coverage, paired Odoo rendering, and
module sign-off remain open.

## Completed bounded task — `ECOM-CATALOG-VARIANT-EXTRA-MEDIA-001`

The next uncovered source-backed catalog behavior is Website Sale's
variant-specific extra media. Odoo's `product.image` model accepts a
`product_variant_id`, `product.product` exposes `product_variant_image_ids`,
the variant form renders “Extra Variant Media,” and the website combination
controller returns a carousel containing variant images before template media.

Core3 migrations 074/075 add durable variant-scoped image metadata with a
deterministic Mug Blue fixture. The Product Variant page/API YAML pair is
separate and joined by `page.id`; Product Detail opens it from variant rows.
The API lists only active variant media in the current company and exposes
permissioned image upload/removal with active/product/company, MIME/size,
duplicate, and optimistic row-version guards. Image media is bounded here;
video URLs and external media transformation remain follow-up gaps.

Focused verification: `bun test
./test/ecommerce_product_variant_images.integration.test.ts --timeout 20000` —
**3 passed, 33 assertions, 0 failures**. Adjacent Product Detail, Variant,
and Cart tests passed **11 tests, 71 assertions, 0 failures**; the bounded set
passed **14 tests, 104 assertions, 0 failures**. The UI audit passed at 697
pages, 706 routes, and 1317 datasources; scoped ESLint and `git diff --check`
passed. Authenticated Core3 desktop/mobile capture is blocked by unavailable
ports 3000/4312/4313; Odoo `/shop` returns exact HTTP 404 on ports 8069/8073.
Browser actor coverage, paired Odoo rendering, and module sign-off remain open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-OPTIONALS-001`

The next uncovered source-backed catalog behavior is Odoo's optional-product
recommendation/configurator relation. `sale` defines `optional_product_ids`,
the Sale and Website Sale configurator controllers return optional products,
and the product template view recommends them when adding to cart or quotation.

Core3 migrations 072/073 add durable ordered company-scoped assignments with
deterministic Mug → Lamp and Chair → Mug fixtures. Product Detail page/API YAML
remains separated by `page.id`; the API lists only active published
same-company targets, exposes guarded assignment/removal mutations, and lets a
customer add an assigned optional to the owned open cart with repeat-safe
quantity increments. Company, publication, self-target, duplicate, stale, and
cart ownership boundaries are explicit.

Focused verification: the optional-products test passed **3 tests, 25
assertions, 0 failures**; adjacent Product Detail, Variant, Cart, Alternatives,
and Accessories tests passed **17 tests, 120 assertions, 0 failures**. The
bounded set therefore passed **20 tests, 145 assertions, 0 failures**. The UI
audit passed at 695 pages, 704 routes, and 1310 datasources; scoped ESLint and
`git diff --check` passed. Authenticated Core3 desktop/mobile capture is
blocked by unavailable ports 3000/4312/4313; Odoo `/shop` returns exact HTTP
404 on ports 8069/8073. Browser actor coverage, paired Odoo rendering, and
module sign-off remain open.

## Completed bounded task — `ECOM-CHECKOUT-CUSTOMER-ADDRESS-001`

The next uncovered Website Sale checkout behavior is authenticated customer
address management. Odoo's `/shop/address` flow creates and updates billing or
delivery partner addresses, and checkout binds the selected address to the
sale order; Core3 had only free-text order shipping addresses.

Migrations 070/071 add deterministic company/customer-scoped address records.
The separate Checkout API/page contracts list only active addresses for the
open owned cart, expose permissioned create/update/archive actions with field,
duplicate, company, ownership, and optimistic row-version guards, and let
checkout select an address whose normalized display is persisted on the order.
Guest checkout remains free-text and does not gain access to customer records.

Focused verification: `bun test
./test/ecommerce_checkout_customer_address.integration.test.ts
./test/ecommerce_checkout.integration.test.ts
./test/ecommerce_checkout_payment_token.integration.test.ts
./test/ecommerce_cart.integration.test.ts --timeout 20000` — **21 passed,
136 assertions, 0 failures**. Core3 desktop/mobile capture is blocked by
unavailable ports 3000/4312/4313; Odoo `/shop` returns exact HTTP 404 on
8069/8073. Browser actor coverage, paired Odoo rendering, external provider
behavior, and module sign-off remain open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-ACCESSORIES-001`

The next uncovered Website Sale catalog/checkout behavior is accessory
products shown while reviewing the cart before payment. Odoo supplies a
company-aware `accessory_product_ids` relation, `_get_website_accessory_product`
filtering, and Sale Order `_cart_accessories()`; Core3 had no durable
accessory relation or cart action.

Migrations 068/069 add deterministic Mug → Lamp and Chair → unpublished Setup
assignments. Product Detail API/page contracts expose permissioned create and
optimistic remove; Cart API/page contracts filter active published same-company
targets not already in the owned open cart and add them with a deterministic,
repeat-safe cart line and cart version update.

Focused verification is `bun test
./test/ecommerce_product_accessories.integration.test.ts --timeout 20000` —
**3 passed, 27 assertions, 0 failures**. Core3 desktop/mobile capture is
blocked by unavailable ports 3000/4312/4313; Odoo `/shop` returns exact HTTP
404 on ports 8069/8073. Browser actor coverage, paired Odoo rendering,
provider/external checkout behavior, and module sign-off remain open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-ALTERNATIVES-001`

The smallest remaining uncovered catalog behavior is Odoo Website Sale's
alternative-product recommendation relation and product-page section. Core3
migrations 066/067 add durable, company-scoped source/destination assignments
with deterministic Mug → Chair/Lamp fixtures and row versions. Product Detail
page/API YAML remains separated by `page.id`; the API lists only active
published same-company targets and exposes `ecommerce.write` assign/remove
actions with self-target, publication, company, duplicate, and stale guards.

Focused verification: `bun test
./test/ecommerce_product_alternatives.integration.test.ts --timeout 20000` —
**3 passed, 22 assertions, 0 failures**. Adjacent Product Detail/Variant
tests, UI audit, scoped ESLint, and diff-check are commit gates. Authenticated
Core3 desktop/mobile capture is blocked by unavailable ports 3000/4312/4313;
Odoo `/shop` returns exact HTTP 404 on ports 8069/8073. Provider/gateway,
broader actor/browser coverage, paired Odoo rendering, and module sign-off
remain open.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-TOKEN-SELECTION-001`

The smallest remaining source-backed checkout gap after the durable payment
token/provider slices, wishlist/merge, and variant configurator is selecting a
saved customer token during checkout. Odoo's payment form supplies customer
tokens, Website Sale passes token flow and sale-order identity to transaction
creation, and `payment.transaction.token_id` preserves the relationship.

Core3 now adds migration 065 `token_id` persistence/indexing, a separate
checkout payment-token datasource/page field, strict active/verified
customer/company/provider/payment-method guards, and token-aware payment
transaction operation/linkage. Guest checkout remains token-free. Payment
Transactions expose the selected token ID.

Focused verification: `bun test
./test/ecommerce_checkout_payment_token.integration.test.ts
./test/ecommerce_checkout.integration.test.ts
./test/ecommerce_payment_tokens.integration.test.ts
./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000` —
**23 passed, 134 assertions, 0 failures**. Scoped ESLint and diff-check pass;
the UI audit is a commit gate. Core3 authenticated desktop/mobile capture is
blocked by unavailable ports 3000/4312/4313, and Odoo `/shop` returns exact
HTTP 404 on ports 8069/8073. Provider/gateway execution, auth/browser actor
coverage, paired Odoo rendering, and module sign-off remain open.

## Current bounded task — `ECOM-CATALOG-WISHLIST-MERGE-001`

The smallest remaining source-backed wishlist behavior is the supplied Odoo
login-session merge. Core3 migration 064 seeds a deterministic anonymous
session containing one item already present in the customer wishlist and one
unique item. The separate wishlist API now provides the Ecommerce-owned
`ecommerce.wishlist.merge_session` action with customer/company/anonymous-owner
guards, optimistic session-version validation, duplicate-safe transfer,
session consumption, and replay idempotency. The existing wishlist page is
unchanged and remains joined to the API by `page.id`.

Focused verification: `bun test
./test/ecommerce_wishlist_merge.integration.test.ts --timeout 20000` — **3
passed, 19 assertions, 0 failures**. The UI audit, scoped lint, and diff-check
are commit gates. Authenticated Core3 desktop/mobile capture is blocked by
unavailable ports 3000/4312/4313; supplied Odoo `/shop` references return exact
HTTP 404 on ports 8069 and 8073. The shared auth login-event binding, broader
actor/browser coverage, paired Odoo rendering, and Ecommerce module sign-off
remain open.

## Completed bounded task — `ECOM-CATALOG-WISHLIST-001`

The smallest remaining source-backed catalog behavior after payment tokens is
the supplied `website_sale_wishlist` addon. Core3 now persists anonymous and
customer wishlist owners/items, deterministic fixtures, product/variant and
company/publication guards, unique product/variant duplicate prevention,
optimistic removal, and DuckDB restart state. Separate page/API contracts are
joined by `page.id: ecommerce-wishlist`; the public module exposes the
HttpOnly-cookie add/list/remove boundary.

Focused verification: `bun test ./test/ecommerce_wishlist.integration.test.ts`
— **4 passed, 31 assertions, 0 failures**. The UI audit passes at 690 pages,
699 routes, and 1284 datasources; scoped ESLint and `git diff --check` pass.
Core3 authenticated desktop/mobile capture is blocked because ports 3000,
4312, and 4313 were unavailable. Odoo `/shop` returns exact HTTP 404 on ports
8069 and 8073. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-wishlist-001/`. Login session
merge, broader actor/browser coverage, paired Odoo rendering, and full module
sign-off remain open.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-TOKENS-001`

The smallest remaining source-backed checkout configuration surface after
payment transactions/providers is Odoo's technical Payment Tokens action.
Core3 now persists masked, company/customer-scoped token records with a
provider-created registration boundary, deterministic fixture, idempotency-key
replay, provider/method/customer/company validation, customer ownership
filtering, and optimistic retirement. Page/API contracts are separate and
joined by `page.id: ecommerce-payment-tokens`.

Focused verification: `bun test ./test/ecommerce_payment_tokens.integration.test.ts`
— **4 passed, 27 assertions, 0 failures**. The adjacent payment/checkout suite
is rerun before commit. The UI audit passes at 688 pages, 697 routes, and 1282
datasources; scoped ESLint and `git diff --check` are commit gates. Core3
authenticated desktop/mobile capture is blocked because ports 3000, 4312, and
4313 were not listening. Odoo `/shop` returns exact HTTP 404 on ports 8069 and
8073. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-tokens-001/`.
Provider credentials/gateway execution, raw token creation, checkout token
selection, broader actor browser coverage, and paired Odoo comparison remain
open; no module sign-off is claimed.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-PROVIDERS-001`

The next smallest source-backed checkout configuration gap after transactions
is Odoo's `payment.provider` action. Core3 now persists company-scoped provider
configuration with deterministic Core3 Offline and Demo Gateway fixtures,
separate Payment Providers page/API contracts, `ecommerce.write` CRUD and
disable/restore actions, code/state/feature/amount validation, optimistic
row-version guards, and DuckDB restart persistence. Live credentials, module
installation, tokens, and external gateway calls remain outside this slice.

Focused verification: `bun test
./test/ecommerce_payment_providers.integration.test.ts
./test/ecommerce_payment_methods.integration.test.ts
./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000` —
**10 passed, 65 assertions, 0 failures**. The UI audit passes at 687 pages,
696 routes, and 1278 datasources. Core3 desktop/mobile capture remains
blocked by the dev backend/runtime boundary documented in evidence; Odoo
`/shop` returns exact HTTP 404 on ports 8069 and 8073. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-providers-001/`.
Module sign-off remains open.

## Current bounded task — `ECOM-CHECKOUT-PAYMENT-TRANSACTIONS-001`

The smallest remaining source-backed checkout gap is Odoo's durable
`payment.transaction` lifecycle behind the already-completed payment-method
catalog. Core3 now persists one pending transaction per authenticated or guest
checkout using a unique order/idempotency key, exposes a separate
company-scoped Payment Transactions page/API, and guards state transitions
with `ecommerce.write`, allowed-state validation, provider-reference
validation, and row-version concurrency. Migrations 055/056 provide the
schema and deterministic confirmed fixture.

Focused verification: `bun test
./test/ecommerce_payment_transactions.integration.test.ts
./test/ecommerce_checkout.integration.test.ts
./test/ecommerce_payment_methods.integration.test.ts --timeout 20000` —
**19 passed, 114 assertions, 0 failures**. The UI audit passes at 686 pages,
695 routes, and 1272 datasources. Core3 desktop/mobile capture is blocked by
the dev backend refusing `/api/modules` while the frontend returns 502;
Odoo `/shop` returns exact HTTP 404 on ports 8069 and 8073. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-transactions-001/`.
Module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-VARIANT-CONFIGURATOR-001`

The remaining source-backed variant gap was the Odoo website configurator's
selected-combination-to-cart resolution, not another variant CRUD surface.
Core3 now exposes a separate Product Detail API/page variant add action,
validates active/published/current-company ownership, persists variant name
and variant price on cart lines, and carries the selected variant through the
anonymous cart route. Migration 054 makes cart-line identity
`(cart, product, variant)` and preserves earlier rows; deterministic line IDs
make repeated authenticated or anonymous adds idempotent while row versions
record quantity increments.

Focused verification: `bun test
./test/ecommerce_variant_configurator.integration.test.ts
./test/ecommerce_cart.integration.test.ts
./test/ecommerce_product_variants.integration.test.ts --timeout 20000` —
3 + 2 + 4 tests, 14 + 14 + 29 assertions, 0 failures (the combined run
reports 9 tests and 57 assertions). Core3 desktop/mobile evidence is blocked
by the unrelated shared Inventory discovery error
`actions[0].title is not allowed`; no shared Inventory files were staged.
Authenticated Odoo `/shop` returned exact HTTP 404 on ports 8069 and 8073.
Evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-variant-configurator-001/`.
The bounded feature is not module sign-off.

## Current state

The current wave has a committed Ecommerce implementation and authenticated
Core3 browser evidence. DEV-4 adds an eCommerce-owned, retry-safe outbox
contract for handing checkout orders to the separate Sales service. Functional
and ownership gates are still incomplete; no full parity claim is made here.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-EXPORT-001`

The smallest remaining concrete catalog action was the Odoo Website Products
list Export affordance. Core3 now has an `ecommerce.read` client CSV export
joined by the Products `page.id`, with stable columns, JSON escaping, current
company scope, durable product source rows, replay/restart coverage, and no
mutation side effects. Focused tests are in
`test/ecommerce_product_export.integration.test.ts`.

Authenticated Core3 desktop/mobile capture is blocked by the unrelated shared
Inventory discovery error `actions[0].title is not allowed`; the temporary
runtime was removed. Odoo `/shop` returns exact HTTP 404 on both supplied
references, so paired comparison is blocked. The bounded commit is recorded
in the handoff; module sign-off remains open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-TAG-IMAGE-001`

The smallest remaining explicit Product Tags gap is Odoo's optional
`product.tag.image` field. The source-backed implementation adds migration
052 durable image metadata/storage and migration 053 deterministic fixture
stability, a separate tag-detail page/API contract, attachment upload/download
actions, image validation, write/read permissions, replacement and stale
row-version guards, and restart persistence. Product Tags list rows now open
the image-capable detail form. Focused tests are in
`test/ecommerce_product_tag_image.integration.test.ts`; authenticated Core3
desktop/mobile and Odoo `/shop` blocker evidence is recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-image-001/`.
The bounded feature commit is `c7cfd29a8d4540d18d95d1b7a4ac29a5490a7a86`
(local only, not pushed); module sign-off remains open.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-VARIANTS-001`

The next source-backed catalog gap is the missing `product.product` variant
resolution surface. The supplied Odoo product and website_sale views/models
define variant list/form records, combination-derived website behavior, and
variant price resolution. Core3 now has migrations 048/049 for durable variant
records, deterministic Mug and Chair fixtures, variant-aware pricelist rules
and cart lines; separated product detail page/API YAML; permissioned CRUD;
combination/reference/price/company validation; and row-version concurrency.

Focused verification passes in
`test/ecommerce_product_variants.integration.test.ts`, including restart
persistence and variant-specific cart pricing. Authenticated Core3 desktop /
mobile captures and authenticated Odoo 404 blocker captures are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-variants-001/`.
Bounded commit: `2c2a356a5c79d6dff97fcd2a871d7bbb23984b8b` (local only, not
pushed); module sign-off remains open.

## Current bounded task — `ECOM-CATALOG-PRODUCT-TAG-VARIANT-ASSIGNMENT-001`

The smallest newly unblocked catalog gap is Odoo Product Tags' explicit
`product_product_ids` variant assignment. Core3 now has the source-backed
variant table, but the completed tag slice still persisted template relations
only. This wave adds migrations 050/051, deterministic variant assignments,
variant option/query data, separate permissioned assign/remove actions,
company/active/combination/duplicate/not-found validation, row-version
concurrency, and restart coverage. Core3 desktop/mobile and authenticated
Odoo `/shop` blocker captures are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-variant-assignment-001/`.
Bounded commit: `fb8312242ee51535d35e2582dd906232e8e10cb4` (local only, not
pushed); module sign-off remains open.

## DEV-4 evidence (2026-09-13)

- Isolated branch/worktree: `agent/odoo-ecommerce-dev4-sales-handoff`.
- Checkout creates exactly one `ecommerce_sales_handoffs` row per order,
  including authenticated and anonymous checkout paths.
- Sales-facing operations expose the handoff envelope and copied order lines.
- Claim/acknowledge mutations enforce attempt limits and optimistic row-version
  concurrency, including stale duplicate rejection.
- Sales now owns a polling consumer that claims the envelope, reads the declared
  order/line operations, imports source-linked Sales records, and acknowledges
  success or failure. The source link and line IDs make retries idempotent.
- Focused suite: `bun test ./test/ecommerce_sales_handoff_consumer.integration.test.ts ./test/ecommerce_checkout.integration.test.ts` —
  14 passed, 69 assertions, 0 failures.
- QA rerun confirms the focused suite passes with `--timeout 20000`; the default 5-second timeout fails the real local import test because it takes about 12.6 seconds. Audit and `git diff --check` pass. Repository lint has two unchanged baseline errors in `test/website_public.integration.test.ts`; the full regression was stopped before completion after unrelated timeout/stale-record failures, so no full-regression pass is claimed.
- QA found no new authenticated browser or paired Odoo evidence for this Sales-only candidate. Existing Core3 checkout captures remain applicable; paired Odoo remains blocked by missing `website_sale` (`/shop` HTTP 404). QA remains bounded and unsigned off.
- Remaining gates: authenticated actor/company matrix, external payment/delivery
  certification, paired Odoo comparison, and central review/merge.

## Review integration

- Integrated commit: `40aee3ed`.
- Reviewer reran `ecommerce_checkout.integration.test.ts`: 11 tests, 59
  assertions, 0 failures, and the repository UI audit passed.
- The Sales-side consumer, external provider certification, actor/company
  browser matrix, and paired Odoo gates remain open; this is not module
  sign-off.

## Completed bounded task — `ECOM-CATALOG-PRODUCT-COMBO-CHOICES-001`

Product Tags and Product Attributes are complete bounded slices. The next
smallest missing catalog surface is Combo Choices: Odoo menu/action/model/list-
form analysis is complete, and Core3 now has durable combo/option migrations,
deterministic fixtures, page/API separation, active non-combo option
validation, company scope, permissioned CRUD, optimistic concurrency, and
restart coverage. Authenticated Core3 desktop/mobile evidence and an
authenticated Odoo desktop/mobile `/shop` 404 blocker capture are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-product-combo-choices-001/`.

Focused Combo Choices plus affected catalog regression tests pass (18 tests,
141 assertions), the authenticated actor matrix passes (3 tests, 22
assertions), and the repository UI audit passes at 671 pages, 680 routes, and
1216 datasources. The paired Odoo comparison is blocked because both supplied
authenticated reference instances return 404 for `/shop`; this feature and the
full Ecommerce module remain unsigned off despite the bounded verification.
Bounded commit: `e32c84f95a9e` (local only, not pushed).

## Completed bounded task — `ECOM-CHECKOUT-PAYMENT-METHODS-001`

The next smallest source-backed gap was Odoo's global Configuration >
eCommerce > Payment Methods action: `menu_ecommerce_payment_methods` →
`payment.action_payment_method`, model `payment.method`. Core3 now has durable
payment-method schema/fixtures (migrations 042/043), a separate page/API YAML
contract, permissioned CRUD with code/feature validation, active/archive
workflow, optimistic concurrency, and checkout selection backed by active
primary rows.

Focused payment-method, checkout, and actor/restart coverage passes with 19
tests and 120 assertions. Authenticated Core3 desktop/mobile evidence, the
desktop create flow for `Browser Wallet`, and the authenticated Odoo `/shop`
404 blocker are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-checkout-payment-methods-001/`.
The full Ecommerce module remains unsigned off because paired Odoo, broader
actor/company browser, and external provider gates remain open. The bounded
implementation commit is reported in the handoff and is local only.

## Completed bounded task — `ECOM-CHECKOUT-DELIVERY-METHODS-001`

The next smallest source-backed checkout/company gap was Odoo's Website >
Global Configuration > eCommerce > Delivery action:
`menu_ecommerce_delivery` → `delivery.action_delivery_carrier_form`, model
`delivery.carrier`. Core3 now has durable delivery-method schema and fixtures
(migrations 044/045), a separate page/API YAML contract, company-scoped active
checkout options, Cash on Delivery compatibility validation, permissioned CRUD,
archive/restore/delete workflow, and optimistic row-version concurrency.

Focused delivery-method, checkout, and actor/restart coverage passes with 19
tests and 122 assertions. The full Ecommerce integration set passes with 71
tests and 485 assertions across 21 files. Authenticated Core3 desktop/mobile evidence and the
authenticated Odoo `/shop` 404 blocker are recorded at
`plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-checkout-delivery-methods-001/`.
The paired Odoo surface, broader actor/company browser matrix, and external
carrier-rate/shipment gates remain open; this is a bounded implementation, not
full Ecommerce sign-off. The bounded commit is recorded in the handoff.

## Completed bounded task — `ECOM-CATALOG-PRICELIST-RULES-001`

The smallest remaining source-backed catalog gap was Odoo's
`product.pricelist.item` rule surface. Core3 now persists Odoo target and
pricing metadata through migrations 046/047, exposes separated page/API YAML,
provides deterministic rule option sources and `ecommerce.write` CRUD, and
guards target, date, value, company, duplicate, and stale-row failures. Cart
pricelist application consumes global/product/category rules with fixed,
percentage, and formula modes. Isolated restart coverage proves the rule and
cart price survive database reopen.

Focused verification and authenticated Core3 desktop/mobile evidence are
recorded at `plan/odoo-ui-parity/evidence/ecommerce/2026-09-20/ecom-catalog-pricelist-rules-001/`.
The browser company boundary is visible for the seeded `My Company` fixture;
the Odoo paired comparison is blocked by exact `/shop` 404 responses on ports
8069 and 8073. Variant-specific resolution remains open because the current
catalog has no separate variant table. This is a bounded implementation, not
full Ecommerce sign-off. The local commit is reported in the handoff.
