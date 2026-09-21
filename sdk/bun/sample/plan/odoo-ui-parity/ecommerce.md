# eCommerce parity — Products and order workflows

Status: qa-in-progress (bounded payment transaction post-processing slice; module sign-off remains open)

## Bounded feature — Payment Transaction Post-processing (`ECOM-CHECKOUT-PAYMENT-TRANSACTION-POST-PROCESS-001`)

Wave 23 selected the remaining Odoo Payment/Website eCommerce transaction
post-processing action. Odoo's Website eCommerce menu opens
`payment.action_payment_transaction`; the transaction form exposes a technical
Post-process button while `is_post_processed` is false, and
`action_post_process` calls `_post_process`, whose generic behavior durably
marks the transaction processed before soft-reloading the view.

Core3 migrations 110/111 add durable `is_post_processed` and
`post_processed_at` state plus deterministic fixture backfill. The existing
Payment Transactions API/page remain separate and now expose the state and a
permissioned `ecommerce.write` post-process action. Optimistic company/version
guards make the action one-shot; ordinary state transitions clear the flag so a
new terminal state can be post-processed again. Checkout-created transactions
initialize the new state explicitly, and migration replay/DuckDB restart
preserve it.

Focused source/contract, transaction workflow, company/idempotency/concurrency,
checkout regression, migration replay, restart, scoped YAML audit, lint, and
diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-checkout-payment-transaction-post-process-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
3000/4312/4313 and no persistent browser runtime; Odoo `/shop` remains an
exact HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Add to Cart Redirect Policy (`ECOM-CHECKOUT-ADD-TO-CART-REDIRECT-001`)

Wave 22 selected Odoo Website Sale's `website.add_to_cart_action` setting,
which is not present in Core3. Odoo's `cart_redirect_setting` exposes Stay on
Product Page and Go to cart; `ir_http` places the value in the website
session, `cart_service.js` redirects to `/shop/cart` for the latter, and the
public `/shop/cart/add` controller owns the add-to-cart workflow.

Core3 migrations 108/109 add a durable company-scoped policy and deterministic
fixture. Separate Add to Cart Redirect page/API YAML exposes the read datasource,
supported options, Configuration menu entry, and an `ecommerce.write`
optimistic update. Authenticated and anonymous Shop add-to-cart mutations now
return deterministic redirect intent (`/ecommerce/shop` or `/ecommerce/cart`)
while preserving cart persistence and company scope. Migration replay and
DuckDB restart preserve the selected policy.

Focused source/contract, policy CRUD, company/validation/concurrency, both cart
workflows, migration replay, restart, scoped YAML audit, lint, and diff-check
evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-checkout-add-to-cart-redirect-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
3000/4312/4313 and no persistent browser runtime; Odoo `/shop` remains an
exact HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Zero-Price Sale Policy (`ECOM-CATALOG-ZERO-PRICE-SALE-POLICY-001`)

Wave 21 selected the next uncovered Website Sale catalog behavior:
`website.prevent_zero_price_sale` and its `contact_us_button_url`. Odoo exposes
the setting through the `hide_add_to_cart_setting` configuration view; product
availability calls `_is_add_to_cart_allowed`, and the product/cart templates
replace Add to Cart with Contact Us when the contextual price is zero. The
Website Sale cart controller enforces the same product-level boundary.

Core3 migrations 106/107 add a durable company-scoped policy and deterministic
fixture. Separate Zero-Price Sale Policy page/API YAML exposes the permissioned
policy update, safe relative/HTTP(S) Contact Us URL validation, and optimistic
row version. Shop projections expose contact-only state and URL; authenticated
and anonymous add-to-cart guards reject zero-priced products while the policy
is enabled and allow them when disabled. Migration replay and DuckDB restart
preserve the policy.

Focused source/contract, zero-price add-to-cart workflow, company permission,
validation, optimistic concurrency, restart, scoped YAML audit, lint, and
diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-zero-price-sale-policy-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
3000/4312/4313 and no persistent browser runtime; Odoo `/shop` remains an
exact HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Shop Default Sort (`ECOM-CATALOG-SHOP-DEFAULT-SORT-001`)

Wave 20 selected the next uncovered Website Sale catalog behavior:
`website.shop_default_sort`. Odoo defines five source-backed choices —
Featured (`website_sequence asc`), Newest Arrivals (`publish_date desc`), Name
(A-Z), Price - Low to High, and Price - High to Low. The Website shop menu and
`action_open_website` lead to `/shop`; `WebsiteSale._get_search_order` uses the
website default when no explicit order is supplied, and the Website Builder
updates it through `/shop/config/website`.

Core3 migrations 104/105 add a durable company-scoped default-sort policy and
deterministic Featured fixture. Separate Shop Default Sort page/API YAML
exposes the five options and an `ecommerce.write` optimistic update action.
Authenticated Shop queries and the public `ecommerce.public.shop` operation use
the policy for deterministic ordering, with company, validation, migration
replay, and DuckDB restart coverage.

Focused source/contract, ordering workflow, company permission, optimistic
concurrency, restart, scoped YAML audit, lint, and diff-check evidence is
recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-shop-default-sort-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
3000/4312/4313 and no persistent browser runtime; Odoo `/shop` remains an
exact HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Checkout Account Policy (`ECOM-CHECKOUT-ACCOUNT-POLICY-001`)

Wave 19 selected the next uncovered Website Sale configuration behavior after
the completed catalog slices: Odoo's `res.config.settings.account_on_checkout`
setting, backed by `website.account_on_checkout`. The Odoo settings view binds
the `checkout_registration_setting` action to Optional, Disabled (buy as
guest), and Mandatory (no guest checkout) choices. Its inverse also maps
optional/mandatory to `auth_signup_uninvited = b2c` and disabled to `b2b`;
checkout templates branch on the same website field for anonymous checkout and
sign-in affordances.

Core3 migrations 102/103 add a durable company-scoped policy and deterministic
fixture. Separate Checkout Account Policy page/API YAML exposes the setting
through the Configuration menu, read datasource, supported mode options, and a
permissioned optimistic update action. Checkout guards enforce mandatory mode
for anonymous carts, preserve authenticated customer checkout, and retain the
Odoo signup-mode mapping. Migration replay and DuckDB restart coverage preserve
both values.

Focused source/contract, validation, company permission, optimistic
concurrency, checkout workflow, migration replay, restart, audit, lint, and
diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-checkout-account-policy-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
3000/4312/4313 and no persistent browser runtime; Odoo `/shop` is an exact
HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Product Feed Configuration and Generation (`ECOM-CATALOG-PRODUCT-FEED-001`)

Wave 18 selected the still-uncovered Website Sale product feed surface. Odoo
defines the `product.feed` model with Google Merchant Center target, website,
language, pricelist, category filters, access token, generated URL, and cached
feed output. `product_feed.py` exposes the token-protected `/gmc.xml` route;
`product_feed_views.xml` provides list/form CRUD and `action_product_feeds`,
and `website_sale_menus.xml` binds Product Feeds to the Website eCommerce menu
through the Product Feed security group.

Core3 migrations 100/101 add durable company-scoped feed configurations,
tokens, cache expiry, and deterministic GMC 1 data. Separate Product Feeds
page/API YAML provides permissioned create/edit/generate/delete actions,
active category/pricelist selectors, generated XML with published same-company
products, and a token-checked public `ecommerce.public.product_feed`
operation. Re-generation uses optimistic row versions; edits invalidate the
cache, and migration replay plus DuckDB restart preserve the configuration and
generated output.

Focused source, paired-contract, CRUD/filter/generation, token, company,
stale, cache invalidation, deletion, migration replay, restart, audit, lint,
and diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-feed-001/`. Authenticated
Core3 desktop/mobile capture remains subject to the browser/runtime blocker;
Odoo `/shop` remains an exact HTTP 404 blocker. This slice is not module
sign-off.

## Bounded feature — Product Website Sequence Reordering (`ECOM-CATALOG-PRODUCT-WEBSITE-SEQUENCE-REORDER-001`)

Odoo source comparison: `website_sale/models/product_template.py` exposes
`set_sequence_top`, `set_sequence_bottom`, `set_sequence_up`, and
`set_sequence_down`; the Website Products list defaults to
`website_sequence` order and renders a `website_sequence` handle widget.
`website_sale_menus.xml` maps the Products menu to
`product_template_action_website`.

Core3 migrations 098/099 add an ordering index and deterministic product
sequence fixtures. The Products page/API remain separate and now expose
permissioned Move Top/Up/Down/Bottom actions. Each workflow is durable,
company-scoped, active-row and optimistic-row-version guarded, and swaps or
repositions products within the same published state; restart coverage
preserves the resulting order.

Focused CRUD/workflow, source, paired-schema, audit, scoped lint, and
diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-website-sequence-reorder-001/`.
Authenticated Core3 desktop/mobile capture is blocked by the missing
persistent browser runtime and unavailable local ports; supplied Odoo `/shop`
probes are exact HTTP 404 on 8069 and 8073. This bounded slice is not module
sign-off.

## Bounded feature — Product Website Category Assignments (`ECOM-CATALOG-PRODUCT-CATEGORY-ASSIGNMENT-001`)

Odoo source comparison: `website_sale/models/product_template.py` defines
`public_categ_ids` as the product template's many-to-many Website Product
Category relation. The Website Products menu opens
`product_template_action_website`; its list view renders
`public_categ_ids` as many-to-many tags, and the product search domain accepts
category descendants through `child_of`.

Core3 migrations 096/097 add a durable product/category assignment relation
with row versions, ordering, active/company scope, and deterministic Mug/Chair
fixtures. Product Detail keeps page/API YAML separate and exposes a category
ListView plus permissioned assign/edit/remove actions. The lifecycle enforces
active same-company categories, duplicate prevention, non-negative ordering,
optimistic concurrency, and DuckDB restart persistence.

Focused CRUD, permission, validation, concurrency, migration replay, paired
schema, audit, scoped lint, and diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-category-assignment-001/`.
Authenticated Core3 desktop/mobile capture is blocked by the missing
persistent browser runtime and unavailable local ports; supplied Odoo `/shop`
probes are exact HTTP 404 on 8069 and 8073. This bounded slice is not module
sign-off.

## Bounded feature — Product Display Dimensions (`ECOM-CATALOG-PRODUCT-DISPLAY-DIMENSIONS-001`)

Odoo source comparison: `website_sale/models/product_template.py` defines
durable `website_size_x` and `website_size_y` integer fields with default 1.
`website_sale/controllers/main.py` clamps both values while placing products
on the website grid and writes them from the Website editor's x/y options.

Core3 migrations 094/095 add durable product display dimensions and
deterministic Mug/Chair fixtures. Products, Shop, and Product Detail retain
separate page/API YAML contracts; list/detail projections expose both values,
and the permissioned product create/edit workflow validates dimensions from 1
through 12, enforces current-company scope and optimistic row versions, and
survives DuckDB restart.

Focused CRUD, company, validation, concurrency, migration replay, paired
schema, audit, scoped lint, and diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-display-dimensions-001/`.
Authenticated Core3 desktop/mobile capture is blocked by the missing
persistent browser runtime and unavailable local ports; supplied Odoo `/shop`
probes are exact HTTP 404 on 8069 and 8073. This bounded slice is not module
sign-off.

## Bounded feature — Category Website Description (`ECOM-CATALOG-CATEGORY-WEBSITE-DESCRIPTION-001`)

Odoo source comparison: `website_sale/models/product_public_category.py`
defines the HTML `website_description` field on `product.public.category`;
the Website Sale category form exposes it through
`product_public_category_action`, and `views/templates.xml` renders
`category.website_description` in the shop category header. The Ecommerce
catalog categories menu points to that action.

Core3 had category hierarchy and cover-image metadata but no durable category
description contract. Migrations 092/093 add the description column and a
deterministic Accessories fixture. Category Detail keeps separate page/API
YAML; its permissioned rich-text edit action enforces active/current-company
scope, a 10,000-character safe-HTML boundary, optimistic row versions, and
DuckDB restart persistence. Clearing the field stores NULL.

Focused category CRUD/cover/description regression, paired schema validation,
audit, scoped lint, and diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-category-website-description-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
and the missing persistent browser runtime; supplied Odoo `/shop` probes are
exact HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Product Reviews and Ratings (`ECOM-CATALOG-PRODUCT-REVIEWS-001`)

Odoo source comparison: `website_sale/models/product_template.py` inherits
`rating.mixin`; the product model exposes the computed `rating_avg` and
`rating_count` values, while `views/templates.xml` renders the Customer
Reviews portal message thread and static rating summary on the product page.

Core3 had no durable product review model or Product Detail review contract.
Migrations 090/091 add company-scoped review records and a deterministic
published Mug review. The paired Product Detail page/API exposes published
review aggregates and an authenticated review list. Permissioned create/edit,
publish/reject, and delete actions enforce active product ownership,
1-to-5/length validation, company scope, optimistic row versions, and
DuckDB restart persistence. Editing returns a review to pending moderation;
only published active reviews contribute to the product aggregate.

Focused functional, regression, paired-schema, audit, scoped-lint, and
diff-check evidence is recorded under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-reviews-001/`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable ports
and the missing persistent browser runtime; supplied Odoo `/shop` probes are
exact HTTP 404 on 8069 and 8073. This bounded slice is not module sign-off.

## Bounded feature — Product SEO Metadata (`ECOM-CATALOG-PRODUCT-SEO-METADATA-001`)

Odoo source comparison: `website/models/mixins.py` defines the
`website.seo.metadata` mixin with `website_meta_title`,
`website_meta_description`, `website_meta_keywords`, `website_meta_og_img`,
and stored `is_seo_optimized`. Website Sale products inherit this mixin, and
`website/views/website_templates.xml` consumes the SEO object for title,
description, keywords, OpenGraph, and Twitter head metadata.

Core3 had the separate customer-facing `website_description` but no durable
SEO metadata lifecycle. Migrations 088/089 add the four SEO fields and a
deterministic Mug fixture. Product Detail retains separate page/API YAML; its
SEO form requires `ecommerce.write`, enforces active/current-company scope,
length and unsafe-URL validation, optimistic row versions, and DuckDB restart
persistence. The API returns the `is_seo_optimized` projection.

Focused verification and schema/audit evidence are recorded in
`evidence/ecommerce/2026-09-21/ecom-catalog-product-seo-metadata-001/`.
Core3 authenticated desktop/mobile rendering is blocked by unavailable
browser/runtime, and Odoo `/shop` returns exact HTTP 404 on ports 8069 and
8073. This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Publication (`ECOM-CATALOG-PRODUCT-PUBLICATION-001`)

Odoo source comparison: `website/models/mixins.py` defines the Website
Published mixin's `is_published`, stored `publish_date`, and
`website_publish_button`; `website_sale/models/product_template.py` recomputes
the publication date when a product is published. Product views expose the
state through the website redirect button, boolean toggle, and Published
filter.

Core3 already filtered Shop by `is_published` but had no durable publication
timestamp or dedicated publish workflow. Migrations 086/087 add
`publish_date` and deterministic published-product timestamps. Products and
Product Detail retain separate page/API YAML contracts with explicit publish
and unpublish actions. The actions require `ecommerce.write`, enforce active
current-company scope and optimistic row versions, refresh the public Shop,
and preserve state through migration replay and DuckDB restart. Product
Variant Detail displays the parent publication timestamp.

Focused verification and schema/audit evidence are recorded in
`evidence/ecommerce/2026-09-21/ecom-catalog-product-publication-001/`.
Core3 authenticated desktop/mobile rendering is blocked by the unavailable
browser/runtime, and Odoo `/shop` returns exact HTTP 404 on ports 8069 and
8073. This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Category Cover Image (`ECOM-CATALOG-CATEGORY-COVER-IMAGE-001`)

Odoo source comparison: `website_sale/models/product_public_category.py`
defines `product.public.category.cover_image`; the category form/view in
`views/product_public_category_views.xml` renders the image and action, and
`controllers/main.py` assigns uploaded data through
`/snippets/category/set_image`.

Core3 had category names and hierarchy but no durable category image lifecycle.
Migrations 084/085 add company and cover-image metadata plus a deterministic
Accessories fixture. The category list and category detail use separate
page/API YAML pairs. Authenticated read/write actions support upload/replace,
download, and removal with Ecommerce permissions, current-company filtering,
image validation, optimistic row versions, and restart persistence. Binary
bytes are kept in the Ecommerce attachment storage route.

Focused verification and schema/audit evidence are recorded in
`evidence/ecommerce/2026-09-21/ecom-catalog-category-cover-image-001/`.
Core3 authenticated desktop/mobile rendering is blocked by unavailable runtime
ports and the missing persistent browser runtime. Odoo `/shop` returns exact
HTTP 404 on ports 8069 and 8073, so paired comparison is blocked. This bounded
slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Documents (`ECOM-CATALOG-PRODUCT-DOCUMENTS-001`)

Odoo source comparison: `product/models/product_document.py` defines the
durable `product.document` attachment-backed model with active/sequence
lifecycle fields. Website Sale adds `shown_on_product_page`, exposes the
publish toggle in `views/product_document_views.xml`, and serves only active,
template-owned, published documents from the public product-document route in
`controllers/main.py`.

Core3 had product images but no product-document model. Migrations 082/083 add
durable product-template document metadata and the deterministic `Mug Care
Guide` fixture. Product Detail lists documents and navigates to a separate
Product Document page/API pair. The document lifecycle supports metadata
creation, multipart binary upload/replacement, authenticated download,
publish/active/sequence edits, deletion, current-company scope, `ecommerce`
permissions, validation, optimistic row versions, migration replay, and
DuckDB restart persistence.

Focused verification and schema/audit evidence are recorded in
`evidence/ecommerce/2026-09-21/ecom-catalog-product-documents-001/`. Core3
authenticated desktop/mobile rendering is blocked by unavailable runtime
ports and the missing persistent browser runtime. Odoo `/shop` returns exact
HTTP 404 on ports 8069 and 8073, so paired comparison is blocked. This bounded
slice is verified; Ecommerce remains unsigned off. URL documents,
variant-specific publication, and the public Odoo document route remain open.

## Bounded feature — Product Website Description (`ECOM-CATALOG-PRODUCT-WEBSITE-DESCRIPTION-001`)

Odoo source comparison: `website_sale/models/product_template.py` defines the
HTML `website_description` field; `controllers/main.py` includes it in
description search; and `views/templates.xml` renders it after the product
detail content through `t-field="product.website_description"`.

Core3 comparison: products had no durable website description or description
search projection. Migrations 080/081 add durable product website-description
content and a deterministic Mug fixture. Separate Products, Shop, and Product
Detail page/API contracts expose the description, search it alongside product
name/category, and provide a rich-text product edit field. Writes require
`ecommerce.write`, current-company scope, optimistic row versions, a 10,000
character boundary, and a script-tag rejection guard.

Focused tests cover Odoo source tracing, page/API separation, deterministic
fixture replay, searchable catalog/detail projections, permission/company and
validation boundaries, stale writes, and DuckDB restart persistence in
`test/ecommerce_product_website_description.integration.test.ts`.
Authenticated Core3 desktop/mobile capture is blocked by the shared runtime;
the repository audit is additionally blocked by an unrelated Timesheets page
schema error. Supplied Odoo references return exact HTTP 404 for `/shop`.
Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-website-description-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Compare-at Pricing (`ECOM-CATALOG-PRODUCT-COMPARE-PRICE-001`)

Odoo source comparison: `website_sale/models/product_template.py` defines
`compare_list_price` as the monetary “Compare to Price” field;
`controllers/product_configurator.py` returns it as a strikethrough candidate
only when it is greater than the actual price; and
`views/product_views.xml` renders the field behind the Website Sale price
comparison group. The same inherited field is available for product variants.

Core3 comparison: product and variant sales prices existed, but no durable
compare-at value or derived display boundary existed. Migrations 078/079 add
durable product/variant compare prices and a deterministic Mug/Mug Blue
fixture. Separate Products, Shop, Product Detail, and Product Variant page/API
contracts expose raw `compare_list_price` plus `compare_at_price` only when it
exceeds the current sales price. Product and variant write actions require
`ecommerce.write`, validate non-negative prices and company scope, and use
optimistic row versions.

Focused tests cover Odoo source tracing, page/API separation, deterministic
fixture replay, product and variant CRUD, visibility/zero boundary,
permission declarations, company isolation, stale writes, and DuckDB restart
persistence in `test/ecommerce_product_compare_price.integration.test.ts`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable runtime
ports; supplied Odoo references return exact HTTP 404 for `/shop`. Evidence is
under `evidence/ecommerce/2026-09-21/ecom-catalog-product-compare-price-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Variant Base-Unit Pricing (`ECOM-CATALOG-VARIANT-BASE-UNIT-PRICING-001`)

Odoo source comparison: `website_sale/models/product_product.py` and
`product_template.py` define `base_unit_count`, `base_unit_id`,
`base_unit_price`, and `base_unit_name`; the combination response includes the
derived unit price; and `product_views.xml` renders the base-unit fields and
“Price Per Unit” in the Website Sale variant form. A zero count hides the
derived price.

Core3 comparison: variants had durable sales prices and variant-specific cart
resolution but no base-unit metadata or derived unit-price surface. Migrations
076/077 add durable count/name columns and a deterministic Mug Blue fixture.
The existing Product Detail and dedicated Product Variant page/API contracts
remain separate and expose the unit metadata and derived price; permissioned
configuration validates company scope, non-negative count, unit-name length,
and optimistic row versions. Zero count persists and hides the unit price.

Focused tests cover Odoo source tracing, page/API separation, deterministic
fixture replay, company/validation/zero-count boundaries, optimistic updates,
and DuckDB restart persistence in
`test/ecommerce_variant_base_units.integration.test.ts`. Authenticated Core3
desktop/mobile capture is blocked by unavailable runtime ports; supplied Odoo
references return exact HTTP 404 for `/shop`. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-variant-base-unit-pricing-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Variant Extra Media (`ECOM-CATALOG-VARIANT-EXTRA-MEDIA-001`)

Odoo source comparison: `website_sale/models/product_image.py` defines the
`product.image` record with `product_variant_id`; the Website Sale variant
model exposes `product_variant_image_ids` as “Extra Variant Images” and merges
variant images into the website carousel; and the variant form renders an
“Extra Variant Media” viewer. The public combination controller returns the
variant carousel when a selected combination changes.

Core3 comparison: product templates already supported durable images, but
variants had no media ownership, detail surface, or selected-variant image
workflow. Migrations 074/075 add durable variant-scoped image metadata and a
deterministic Mug Blue fixture. A dedicated Product Variant page/API pair,
joined by `page.id: ecommerce-product-variant-detail`, lists media and exposes
permissioned image upload/removal with company, active-product, file, duplicate,
and optimistic row-version guards. Video URLs and external media processing are
explicitly outside this bounded image-only slice.

Focused tests cover Odoo source tracing, page/API separation, fixture replay,
company/file/duplicate validation, CRUD, concurrency, and DuckDB restart
persistence in `test/ecommerce_product_variant_images.integration.test.ts`.
Authenticated Core3 desktop/mobile capture is blocked by unavailable runtime
ports; supplied Odoo references return exact HTTP 404 for `/shop`. Evidence is
under `evidence/ecommerce/2026-09-21/ecom-catalog-variant-extra-media-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Optional Recommendations (`ECOM-CATALOG-PRODUCT-OPTIONALS-001`)

Odoo source comparison: `sale/models/product_template.py` defines the
`optional_product_ids` relation; the Sale and Website Sale product configurator
controllers expose optional products when a product is added to the cart; and
the product template view labels the field as a recommendation for adding to
cart or quotation.

Core3 comparison: Product Detail already had variants, alternatives, and
accessories, but no durable optional-product relation or add-to-cart workflow.
Migrations 072/073 add ordered company-scoped assignments and deterministic
Mug → Lamp / Chair → Mug fixtures. The separate Product Detail page/API
contracts expose published same-company optionals, permissioned assignment and
stale removal, and an idempotent optional-to-cart action. The page/API join is
`page.id: ecommerce-product-detail`.

Focused tests cover source tracing, page/API separation, deterministic fixture
replay, company/publication/self/duplicate guards, idempotent cart addition,
stale removal, and DuckDB restart persistence in
`test/ecommerce_product_optionals.integration.test.ts`. Authenticated Core3
desktop/mobile capture is blocked by unavailable runtime ports; supplied Odoo
references return exact HTTP 404 for `/shop`. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-optionals-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Checkout Customer Addresses (`ECOM-CHECKOUT-CUSTOMER-ADDRESS-001`)

Odoo source comparison: `website_sale/controllers/main.py` provides
`/shop/address`, `shop_address_submit`, and `shop_update_address`; its address
flow creates/updates billing or delivery partner addresses and binds them to
the website sale order. `website_sale/models/res_partner.py` extends the
frontend-writable address fields, and `views/templates.xml` renders Address
Management and the address-on-checkout card.

Core3 comparison: checkout previously accepted only free-text
`shipping_address`. Migrations 070/071 add durable company/customer-scoped
billing and delivery addresses with deterministic Acme fixtures. The separate
Checkout page/API contracts expose owned saved addresses, permissioned
create/update/archive actions with field, duplicate, ownership, company, and
row-version guards, and an optional selected address that is rendered into the
persisted order shipping address. Guest checkout keeps its existing free-text
contract.

Focused tests cover Odoo source tracing, page/API separation, deterministic
fixtures, ownership/company/type/field/duplicate validation, optimistic CRUD,
saved-address order selection, migration replay, guest regression, and DuckDB
restart persistence in `test/ecommerce_checkout_customer_address.integration.test.ts`.
Core3 authenticated desktop/mobile capture is blocked by unavailable runtime
ports; supplied Odoo references return exact HTTP 404 for `/shop`. Evidence is
under `evidence/ecommerce/2026-09-21/ecom-checkout-customer-address-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Accessories (`ECOM-CATALOG-PRODUCT-ACCESSORIES-001`)

Odoo source comparison: `website_sale/models/product_template.py` defines the
company-aware `accessory_product_ids` relation and
`_get_website_accessory_product()`. `website_sale/models/sale_order.py`
computes `_cart_accessories()` from products already in the cart, while
`product_views.xml` labels the editor field “Suggested accessories in the eCommerce cart”.
Website Sale shows these products for cross-sell before payment.

Core3 comparison: the catalog had alternatives but no accessory relation or
cart recommendation workflow. Migrations 068/069 add durable ordered
source/accessory assignments with deterministic Mug → Lamp and Chair →
unpublished Setup fixtures. Product Detail and Cart remain separate page/API
contracts joined by `page.id`: catalog editors get permissioned assignment and
stale removal, while Cart exposes only active published same-company
accessories not already present and adds them through an idempotent mutation.

Focused tests cover source tracing, page/API separation, deterministic
fixtures, publication/company/duplicate guards, idempotent repeated cart add,
stale removal, migration replay, and DuckDB restart persistence in
`test/ecommerce_product_accessories.integration.test.ts`. Core3 authenticated
desktop/mobile capture is blocked by unavailable runtime ports; supplied Odoo
references return exact HTTP 404 for `/shop`. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-accessories-001/`. This
bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Product Alternatives (`ECOM-CATALOG-PRODUCT-ALTERNATIVES-001`)

Odoo source comparison: `website_sale/models/product_template.py` defines the
company-aware `alternative_product_ids` relation and
`_get_website_alternative_product()`. The supplied
`website_sale/views/templates.xml` renders the `Alternative Products`
recommended-products section on the product page when alternatives exist.

Core3 comparison: the catalog had durable products, variants, tags, images,
and pricing but no alternative-product relation or Product Detail recommendation
surface. Migrations 066/067 add a durable source/destination relation with
sequence, company, active state, unique assignment, deterministic Mug → Chair /
Lamp fixtures, and row-version concurrency. The existing Product Detail page
and API remain separate and joined by `page.id`; the API exposes published
same-company alternatives and permissioned assign/remove actions with source,
target, publication, company, duplicate, and stale guards.

Focused tests cover Odoo source tracing, page/API separation, deterministic
fixtures, publication/company/duplicate validation, permissioned CRUD, stale
removal, migration replay, and DuckDB restart persistence in
`test/ecommerce_product_alternatives.integration.test.ts`. Core3 authenticated
desktop/mobile capture is blocked by unavailable runtime ports; both supplied
Odoo references return exact HTTP 404 for `/shop`. Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-product-alternatives-001/`. This
bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Checkout Payment Token Selection (`ECOM-CHECKOUT-PAYMENT-TOKEN-SELECTION-001`)

Odoo source comparison: the supplied `payment/views/payment_form_templates.xml`
renders customer-owned `tokens_sudo` when token selection is allowed and
passes the selected token through the payment form. The Website Sale payment
controller accepts `flow == 'token'`, includes `sale_order_id` when creating
the transaction, and the supplied `payment.transaction` model persists
`token_id` with the provider/payment-method relationship.

Core3 comparison: payment tokens were durable and manageable but checkout
ignored them. Migration 065 adds durable `token_id` linkage and an index to
payment transactions. The separate checkout API/page contracts expose only
active, verified, provider-enabled tokens for the open customer cart. The
authenticated checkout mutation validates customer/company/provider/payment
method ownership, stores the token and `offline_token` operation on the
transaction, and remains idempotent through the existing order/cart boundary;
guest checkout cannot submit a customer token. Payment Transactions now expose
the selected token ID.

Focused tests cover Odoo source tracing, page/API separation, token option
filtering, permission/company/provider/method validation, checkout replay,
transaction linkage, migration replay, and DuckDB restart persistence in
`test/ecommerce_checkout_payment_token.integration.test.ts`. Core3
authenticated desktop/mobile capture is blocked by unavailable runtime ports;
both supplied Odoo references return exact HTTP 404 for `/shop`. Evidence is
under `evidence/ecommerce/2026-09-21/ecom-checkout-payment-token-selection-001/`.
This bounded slice is verified; Ecommerce remains unsigned off.

## Bounded feature — Wishlist Session Merge (`ECOM-CATALOG-WISHLIST-MERGE-001`)

Odoo source comparison: `website_sale_wishlist/models/product_wishlist.py`
defines `_check_wishlist_from_session()`. The login hook in
`website_sale_wishlist/models/res_users.py` calls it; duplicate session products
are unlinked, remaining session products are assigned to the logged-in partner,
and `request.session['wishlist_ids']` is popped.

Core3 comparison: migration 064 adds deterministic anonymous session data with
one duplicate and one unique published product. The separate wishlist API
contract now exposes a permissioned `ecommerce.wishlist.merge_session` action
joined to `page.id: ecommerce-wishlist`. It validates company/customer scope,
the anonymous session owner, and an optimistic session row version; it creates
the customer owner if absent, preserves one product/variant per customer
wishlist, removes the consumed session rows, and replays safely after the
session has already been consumed. The action is the Ecommerce-owned consumer
contract; binding it to the shared auth login event remains an auth-boundary
follow-up and is not claimed here.

Focused tests cover Odoo login-hook tracing, page/API separation, migration
replay, wrong-company and stale-session rejection, duplicate removal, unique
item transfer, idempotent replay, and DuckDB restart persistence in
`test/ecommerce_wishlist_merge.integration.test.ts`. Core3 authenticated
desktop/mobile capture is blocked because ports 3000, 4312, and 4313 are not
available; both supplied Odoo references return exact HTTP 404 for `/shop`.
Evidence is under
`evidence/ecommerce/2026-09-21/ecom-catalog-wishlist-merge-001/`. This is a
bounded verified slice; Ecommerce remains unsigned off.

## Bounded feature — Wishlist Lifecycle (`ECOM-CATALOG-WISHLIST-001`)

Odoo source comparison: the supplied `website_sale_wishlist` addon defines
`product.wishlist` with unique product/partner ownership, website/pricelist/
price metadata, active state, unpublished-product filtering, and public add,
list, remove, and product-ID routes. Anonymous wishlists use session IDs;
login merges session items into the customer list and removes duplicates.
Wishlist buttons are injected into product cards, product detail, and cart
Save for Later controls.

Core3 comparison: migrations 062/063 add durable wishlist owner/item tables,
deterministic customer fixture data, and a unique `(wishlist, product, variant)`
key. Separate wishlist page/API YAML contracts expose customer/company-scoped
published items, guarded customer add/remove, anonymous cookie-scoped public
add/list/remove routes, product/variant validation, optimistic row-version
checks, and idempotent duplicate adds. Saved product metadata and price are
stored; payment secrets and live gateway behavior are not involved.

Focused tests cover Odoo source tracing, page/API separation, migration replay,
customer/company ownership, publication/variant validation, duplicate replay,
anonymous cookie routes, stale removal, and DuckDB restart persistence in
`test/ecommerce_wishlist.integration.test.ts`. Core3 authenticated desktop/
mobile capture was blocked because ports 3000, 4312, and 4313 were unavailable;
both supplied Odoo references return exact HTTP 404 for `/shop`. Evidence is
under `evidence/ecommerce/2026-09-21/ecom-catalog-wishlist-001/`. This bounded
feature is verified but Ecommerce remains unsigned off.

## Bounded feature — Payment Token Lifecycle (`ECOM-CHECKOUT-PAYMENT-TOKENS-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` exposes the
technical Website > Configuration > eCommerce > Payment Tokens menu through
`payment.action_payment_token` with `base.group_no_one`. The supplied
`payment/views/payment_token_views.xml` makes the list/form read-only (`create`
and `edit` false), exposes masked payment details, payment method, partner,
provider, provider reference, company, and archived filtering. Payment security
rules scope normal users to their own partner tokens and companies; the Website
Sale override excludes saved tokens from express checkout.

Core3 comparison: migrations 059/060/061 add durable company/customer-scoped
tokens, a deterministic masked card fixture, and tokenization compatibility for
the existing demo card/provider. Separate Payment Tokens page/API contracts
provide read filtering, an external-provider registration boundary that stores
only masked details, idempotency-key replay, provider/method/customer/company
validation, and optimistic archive/retirement. No raw payment secret, provider
credential, gateway call, or unarchive action is implemented.

Focused tests cover the Odoo menu/view trace, page/API separation, fixture
replay, masked-value/provider/method/customer/company validation, idempotent
registration, customer ownership filtering, optimistic retirement, and DuckDB
restart persistence in `test/ecommerce_payment_tokens.integration.test.ts`.
Core3 authenticated desktop/mobile capture was attempted but blocked because
the local runtime ports were not listening; both supplied Odoo references
return exact HTTP 404 for `/shop`. Evidence is under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-tokens-001/`. This bounded
feature is verified but Ecommerce remains unsigned off.

## Bounded feature — Payment Provider Configuration (`ECOM-CHECKOUT-PAYMENT-PROVIDERS-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` exposes
Website > Configuration > eCommerce > Payment Providers through
`payment.action_payment_provider`, model `payment.provider`. The supplied
provider model defines company-scoped name/code/sequence/state, publication,
supported payment methods, tokenization, manual capture, express checkout,
refund support, amount/country/currency availability, and payment messages.
The Odoo list is non-creating while the form configures an installed provider;
the state and published controls are status-dependent.

Core3 comparison: payment methods and transactions were durable, but no
provider configuration source existed. This slice adds migrations 057/058 for
company-scoped providers and deterministic Core3 Offline/Demo Gateway data,
separate page/API YAML contracts, permissioned create/edit/disable/restore,
provider code/state/feature/amount validation, company scope, optimistic row
versions, and restart persistence. It intentionally does not claim provider
credentials, module installation, token vaults, or external gateway calls.

Focused tests cover Odoo/menu/page/API tracing, deterministic fixtures,
permissioned CRUD, feature and company validation, disable/restore, stale
writes, migration replay, and DuckDB restart persistence in
`test/ecommerce_payment_providers.integration.test.ts`. Core3 desktop/mobile
capture remains blocked by the prior backend startup/runtime boundary; both
supplied Odoo references return exact HTTP 404 for `/shop`. This bounded
feature is verified but Ecommerce remains unsigned off.

## Bounded feature — Payment Transaction Lifecycle (`ECOM-CHECKOUT-PAYMENT-TRANSACTIONS-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` exposes
Website > Configuration > eCommerce > Payment Transactions through
`payment.action_payment_transaction` (restricted to the technical payment
group). The supplied `payment/models/payment_transaction.py` defines unique
references, provider/payment method, amount/currency, company, customer,
provider reference, and the draft/pending/authorized/done/cancel/error state
model. `payment/views/payment_transaction_views.xml` supplies list, kanban,
form, search, graph, and pivot views with capture/void/post-process actions.

Core3 comparison: configured payment methods previously validated checkout but
checkout did not persist a transaction boundary. This slice adds migrations
055/056 for durable transaction rows and a deterministic confirmed fixture;
authenticated and guest checkout each create one pending transaction keyed by
the checkout cart/order; the separate Payment Transactions page/API exposes
company-scoped reads and an `ecommerce.write` optimistic state-transition
action. Allowed state transitions, provider-reference requirements, company
scope, idempotent checkout insert, and restart persistence are tested. This
does not claim a live provider adapter, tokenization, capture/refund wizard,
or external callback boundary.

Focused tests cover page/API/menu contracts, checkout transaction creation and
idempotency, guarded transitions, company/stale/invalid validation, migration
replay, and DuckDB restart persistence in
`test/ecommerce_payment_transactions.integration.test.ts`. Core3 browser
capture was attempted at desktop/mobile but the backend did not become ready;
the frontend returned 502 for `/api/modules` and route loads. Both supplied
Odoo references return exact HTTP 404 for `/shop`; paired comparison is
blocked. This bounded feature is verified but Ecommerce remains unsigned off.

## Bounded feature — Variant Configurator Cart Resolution (`ECOM-CATALOG-VARIANT-CONFIGURATOR-001`)

Odoo source comparison: the supplied `website_sale/controllers/variant.py`
defines the public `website_sale/get_combination_info` JSON route and resolves
the selected combination to a concrete `product.product` before cart work;
`product_template.py` provides possible-variant resolution and
`product_product.py` supplies variant-specific combination information. The
Odoo flow therefore carries the selected variant, rather than only the
template, into the cart.

Core3 comparison: the prior variant slice persisted and priced variants but
the Shop/Product Detail add-to-cart contract still accepted only a template
product. This bounded slice adds the missing variant-aware cart action on the
separate Product Detail API/page contracts, validates active published
variants against the product and current company, stores variant identity and
price on the durable cart line, and carries `variant_id` through the public
anonymous cart route. Migration 054 replaces the old cart-line uniqueness
with a durable `(cart, product, variant)` identity while preserving existing
rows; deterministic line IDs make repeated adds idempotent and row versions
make quantity changes observable.

Focused tests cover API/page separation, authenticated and anonymous variant
adds, permissioned/company/active validation, idempotent quantity increments,
migration replay, and DuckDB restart persistence in
`test/ecommerce_variant_configurator.integration.test.ts`. Core3 authenticated
desktop/mobile capture is blocked by the unrelated shared discovery boundary
(`services/inventory/api/physical-inventory.yaml`: `actions[0].title is not
allowed`). Both supplied authenticated Odoo references return exact HTTP 404
for `/shop`; paired visual comparison is blocked. This bounded feature is
verified but Ecommerce remains unsigned off.

## Bounded feature — Product Variants (`ECOM-CATALOG-PRODUCT-VARIANTS-001`)

Odoo source comparison: the supplied `product/views/product_views.xml` defines
`product_variant_action` for `product.product` with variant list/form views;
`website_sale/views/product_views.xml` adds the website variant list/form
surface. `website_sale/models/product_product.py` resolves website URLs and
variant media/price behavior from `product_template_attribute_value_ids`, and
`website_sale/models/product_template_attribute_value.py` supplies the
attribute-value extra-price behavior. The configurator controller resolves a
selected combination before adding a product to the cart.

Core3 comparison: before this slice, Ecommerce persisted product templates and
attribute values but had no durable `product.product` equivalent. Migrations
048/049 add `ecommerce_product_variants`, deterministic Mug and Chair variants,
variant references on pricelist rules and cart lines, and an idempotent
variant-specific Mug rule. The product detail page now owns a responsive
variant `ListView`, while `api/product-detail.yaml` owns the matching
`page.id` datasource and permissioned create/edit/delete actions. Combination
and internal-reference uniqueness, active-parent/company scope, non-negative
prices, and row-version concurrency are enforced. Cart price resolution uses a
matching variant rule and variant sales price before the template price.

This bounded slice intentionally does not claim the full Odoo configurator,
variant media, currency conversion, or optional-product behavior. Focused
integration tests cover page/API separation, migration rerun, company/read
scope, CRUD, validation, stale writes, DuckDB restart persistence, and
variant-specific cart pricing. Authenticated Core3 desktop/mobile and
authenticated Odoo `/shop` blocker evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-product-variants-001/`. Both Odoo
references return exact HTTP 404 for `/shop`, so paired visual comparison is
blocked. Ecommerce remains unsigned off.

## Bounded feature — Product Tag Variant Assignments (`ECOM-CATALOG-PRODUCT-TAG-VARIANT-ASSIGNMENT-001`)

Odoo source comparison: `product/models/product_tag.py` defines the separate
`product_product_ids` many-to-many relation with a variant domain, while
`product/views/product_tag_views.xml` exposes the `Product Variant` field in
the Product Tags list. `website_sale/models/product_tag.py` adds the website
mixin, and `website_sale/controllers/variant.py` renders the union of template
and variant tags for a selected website combination.

Core3 comparison: the completed Product Tags slice persisted only template
assignments. With the completed variant table now available, migrations
050/051 add `ecommerce_product_tag_variants` and deterministic Mug/Chair
variant assignments. The tag API adds a read-protected variant option source,
variant counts/names/IDs, and separate permissioned assign/remove actions.
Each action validates active combination variants and company scope, rejects
duplicates/missing assignments, and increments the tag row version under
optimistic concurrency. The Product Tags ListView exposes assigned variant
counts/names and row actions while retaining template assignment CRUD.

Focused tests cover Odoo source/page/API separation, migration fixtures,
permission/company validation, assignment CRUD, duplicate/not-found/stale
guards, and DuckDB restart persistence. Authenticated Core3 desktop/mobile
and authenticated Odoo `/shop` blocker evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-variant-assignment-001/`.
Both Odoo references return exact HTTP 404 for `/shop`, so paired comparison
is blocked. Ecommerce remains unsigned off.

## Bounded feature — Pricelist Rules (`ECOM-CATALOG-PRICELIST-RULES-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` places the
Pricelists action under Website > Configuration > eCommerce > Products and
opens `product.product_pricelist_action2`. The supplied
`product/models/product_pricelist_item.py` and
`product/views/product_pricelist_item_views.xml` define
`product.pricelist.item` targets (global, category, product, variant), minimum
quantity/date windows, list/cost/pricelist bases, fixed/percentage/formula
pricing, rounding, surcharge, and margins with target/date/value constraints.

Core3 comparison: `services/ecommerce/pages/pricelist-detail.yaml` owns the
authenticated pricelist detail route and visible rules `ListView`, while
`services/ecommerce/api/pricelist-detail.yaml` owns the matching `page.id`
detail/rules/options datasources and permissioned server-form CRUD. Migrations
046/047 add durable rule fields, row-version concurrency, and deterministic
upgrades for the three existing demo rules. Cart pricing resolves
global/product/category rules and fixed, percentage, and formula computations
from persisted rows. Focused tests cover CRUD, permissions, company scope,
target/date/value validation, stale writes, migration rerun, restart
persistence, and cart application.

Authenticated Core3 desktop/mobile and rule-form evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-pricelist-rules-001/`. The browser
records the expected cross-company rejection because the authenticated Core3
company is `Core3 Demo Company` while deterministic pricelist fixtures belong
to `My Company`. Both supplied Odoo references return exact HTTP 404 for
`/shop`, so paired comparison is blocked. True product-template/variant
resolution remains open because the current Ecommerce catalog has no separate
`product.product` table. This bounded slice and Ecommerce remain unsigned off.

## Bounded feature — Product Attributes (`ECOM-CATALOG-PRODUCT-ATTRIBUTES-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` registers
`menu_product_attribute_action` under Website > Configuration > eCommerce >
Products and opens `product.attribute_action`. The supplied
`product/models/product_attribute.py` model is ordered by sequence/id and
defines name, active, variant creation mode, display type, sequence, and
attribute values. `website_sale/models/product_attribute.py` adds eCommerce
filter visibility, product-card variant preview, and thumbnail controls.
The list/form views in `product/views/product_attribute_views.xml` and
`website_sale/views/product_attribute_views.xml` expose those controls and
the inline attribute-value editor.

Core3 comparison: `services/ecommerce/pages/product-attributes.yaml` owns
`/ecommerce/product-attributes` and joins
`services/ecommerce/api/product-attributes.yaml` by
`page.id: ecommerce-product-attributes`. Migrations 038/039 add durable
attribute/value tables and deterministic Color, Size, and Material fixtures.
The API supports search, active filtering, display/variant/eCommerce options,
newline-delimited durable values, permissioned create/edit/delete, and
optimistic row-version cleanup. Guards enforce unique names, valid options,
the Odoo multi-checkbox/no-variant rule, and preview-mode constraints.

Focused CRUD, value parsing, permission, validation, migration-rerun, and
DuckDB restart tests pass. Authenticated Core3 desktop/mobile evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-product-attributes-001/`; the
desktop create flow persisted `Browser Finish Attribute` with Metal and Wood
values. Authenticated Odoo captures on ports 8069 and 8073 both show `/shop`
404, so the paired Product Attributes comparison is blocked and Ecommerce
remains unsigned.

## Bounded feature — Product Tags (`ECOM-CATALOG-PRODUCT-TAGS-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` adds
`product_catalog_product_tags` under Website > Configuration > eCommerce >
Products and opens `product.product_tag_action`. The supplied
`product/models/product_tag.py` defines ordered `product.tag` records with
unique required `name`, `sequence`, `color`, `visible_to_customers`, product
template/variant assignments, and an optional image. The list/form views in
`product/views/product_tag_views.xml` expose tag visibility/color and the
many-to-many product assignment surface.

Core3 comparison: `services/ecommerce/pages/product-tags.yaml` owns
`/ecommerce/product-tags` and joins `services/ecommerce/api/product-tags.yaml`
through `page.id: ecommerce-product-tags`. Migrations 036/037 add durable tag
and tag-product relation tables with deterministic Featured, New arrival, and
Service fixtures. The page/API provide search, customer-visibility filtering,
empty/transport errors, customer-facing color, product assignment, and
permissioned create/edit/delete. Server guards enforce unique names, valid
colors, optimistic row versions, and relation cleanup on edit/delete.
This bounded Core3 slice maps the available product-template catalog, Odoo
variant-only tag assignments, and the optional Odoo tag image through the
dedicated detail surface.

Focused CRUD, permission, validation, assignment, migration-rerun, and DuckDB
restart tests pass. Authenticated Core3 desktop/mobile evidence is under
`evidence/ecommerce/2026-09-20/ecom-catalog-product-tags-001/`; the desktop
create flow persisted `Browser Catalog Tag Verified` with Core3 Ceramic Mug assigned.
Authenticated Odoo captures on ports 8069 and 8073 both show `/shop` 404, so
the paired Product Tags comparison is blocked and Ecommerce remains unsigned.

## Bounded feature — Product Tag Images (`ECOM-CATALOG-PRODUCT-TAG-IMAGE-001`)

Odoo source comparison: the supplied `product/models/product_tag.py` defines
`image = fields.Image(max_width=200, max_height=200)` on `product.tag`.
`product/views/product_tag_views.xml` renders it as the form avatar when the
tag is customer-visible and exposes it as an optional list image. The
website_sale tag renderer uses the image when present and otherwise falls back
to the tag color/name presentation.

Core3 comparison: the prior Product Tags slice persisted tag metadata and
template/variant assignments but left the Odoo image field open. This bounded
slice adds durable `ecommerce_product_tag_images` storage (migration 052) and
an idempotent tag fixture migration (053), plus the separate
`product-tag-detail.yaml` page/API pair. The detail page uses the existing
OdooFormView attachment contract, with an image-only, 5 MB upload guard,
permissioned read/download and write/upload actions, replacement semantics,
tag row-version concurrency, and local durable storage. Product Tags now opens
the detail page from its list; the existing tag list/API contract remains
separate and intact.

Focused tests cover the Odoo/page/API/storage trace, read/write permissions,
mime/size validation, replacement without partial writes, stale upload
rejection, download bytes, migration rerun, and DuckDB restart persistence in
`test/ecommerce_product_tag_image.integration.test.ts`. Authenticated Core3
desktop/mobile evidence and authenticated Odoo `/shop` blocker captures are
under `evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-image-001/`.
Both Odoo references return exact HTTP 404 for `/shop`, so paired visual
comparison is blocked. This is a bounded implementation; Ecommerce remains
unsigned off.

## Bounded feature — Product Export (`ECOM-CATALOG-PRODUCT-EXPORT-001`)

Odoo source comparison: `website_sale/views/product_views.xml` defines the
Website Products action `product_template_action_website` for the
`product.template` kanban/list/form surface. Odoo's standard list view adds
the read-protected Export affordance for visible product rows; the action
defaults to website sequence ordering and published-product filtering.

Core3 comparison: `services/ecommerce/pages/products.yaml` now exposes an
Export header action while `services/ecommerce/api/products.yaml` owns the
matching `page.id` client action and deterministic CSV contract. The action
reads only the authenticated, company-scoped `ecommerce_products` datasource,
uses stable columns and JSON CSV escaping, and has no mutation or duplicate
side effects. Existing durable product migrations, row versions, company
scope, replay-safe demo data, and restart persistence back the export.

Focused tests cover page/API separation, `ecommerce.read` permission, stable
columns/filename/content type, company isolation, row-version visibility under
a concurrent edit, migration replay, and DuckDB restart persistence in
`test/ecommerce_product_export.integration.test.ts`. Core3 browser capture is
blocked by an unrelated shared Inventory YAML boundary
(`actions[0].title is not allowed`); the temporary isolated runtime was
removed without staging it. Both Odoo `/shop` endpoints return exact HTTP 404
on ports 8069 and 8073, so paired visual comparison remains blocked. This is
a bounded implementation, not Ecommerce sign-off.

## Bounded feature — Product Ribbons (`ECOM-CATALOG-RIBBONS-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` places
`product_catalog_product_ribbons` (label Product Ribbons) under Website >
Configuration > eCommerce > Products and opens
`website_sale.product_ribbon_action`. `models/product_ribbon.py` defines the
ordered `product.ribbon` model with `name`, `sequence`, `bg_color`,
`text_color`, `position`, `style`, `assign`, and `new_period`; only one
automatic `sale` or `new` assignment is allowed. The list/form views in
`views/product_ribbon_views.xml` expose the same configuration surface, and
`data/data.xml` seeds Sale, Sold out, Out of stock, and New! ribbons.

Core3 comparison: `services/ecommerce/pages/product-ribbons.yaml` owns the
route `/ecommerce/product-ribbons` and joins the separate
`services/ecommerce/api/product-ribbons.yaml` contract by
`page.id: ecommerce-product-ribbons`. The API migration creates the durable
`ecommerce_product_ribbons` table and deterministic Odoo-like fixtures. The
manifest adds the Products > Product Ribbons menu entry. Create, edit, and
delete mutations require `ecommerce.write`, reads require `ecommerce.read`,
automatic-assignment uniqueness and field validation are enforced server-side,
and row-version guards protect edits/deletes. Focused tests cover migration
reruns, search/filter/empty/transport states, CRUD, permissions, stale writes,
and DuckDB restart persistence.

Authenticated browser evidence was captured on 2026-09-20 under
`evidence/ecommerce/2026-09-20/ecom-catalog-ribbons-001/`: Core3 desktop list,
create form, post-create list, and mobile list are present with no page or
request errors. The Odoo credentials/database authentication succeeded on
ports 8069 and 8073 at desktop and mobile viewports, but `/shop` returned the
authenticated 404 page on both instances; the reference database still lacks
the installed Website/eCommerce surface, so paired Product Ribbon visual
comparison is blocked and this feature/module is not signed off.

## Bounded feature — Combo Choices (`ECOM-CATALOG-PRODUCT-COMBO-CHOICES-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` registers
`menu_product_combos` under Website > Configuration > eCommerce > Products
with `product.product_combo_action`. The supplied
`product/views/product_combo_views.xml` action is `product.combo`, path
`combo-choices`, and list/form. `product/models/product_combo.py` defines
ordered `name`, `sequence`, nullable company, computed product count, and
computed `base_price` as the minimum selected product price. Its constraints
require at least one option and reject duplicate products. The related
`product_combo_item.py` model stores the selected `product_id` and `extra_price`
and rejects combo products as options.

Core3 comparison: `services/ecommerce/pages/combo-choices.yaml` owns
`/ecommerce/combo-choices` and joins the separate
`services/ecommerce/api/combo-choices.yaml` contract by
`page.id: ecommerce-combo-choices`. Migrations 040/041 add durable combo and
option tables with deterministic Workspace Essentials and Office Upgrade
fixtures. The API exposes search, product option lookup, computed minimum
price, empty/transport errors, permissioned CRUD, company scope, and
newline-delimited `product-id|extra-price` options. Validation enforces
non-empty active non-combo products, non-negative prices, unique options,
optimistic row-version concurrency, and relation cleanup on edit/delete.

Focused CRUD, permission, validation, migration-rerun, and DuckDB restart tests
pass. Authenticated Core3 desktop/mobile evidence and the exact authenticated
Odoo `/shop` blocker are recorded under
`evidence/ecommerce/2026-09-20/ecom-catalog-product-combo-choices-001/`.
The Core3 desktop create interaction persists a new combo and options; the
Odoo reference continues to return authenticated 404 on ports 8069 and 8073,
so paired visual comparison is blocked and Ecommerce remains unsigned.

## Bounded feature — Payment Methods (`ECOM-CHECKOUT-PAYMENT-METHODS-001`)

Odoo source comparison: `website_sale/views/website_sale_menus.xml` adds
`menu_ecommerce_payment_methods` under Website > Global Configuration >
eCommerce and opens `payment.action_payment_method`. The supplied
`payment/models/payment_method.py` defines the ordered `payment.method` model
with required name/code, sequence, primary/brand relationship, supported
providers and availability, active state, and payment feature capabilities.
`payment/views/payment_method_views.xml` exposes list, kanban, and form views;
the action filters to primary methods and defaults to available methods.

Core3 comparison: `services/ecommerce/pages/payment-methods.yaml` owns
`/ecommerce/payment-methods` and joins the separate
`services/ecommerce/api/payment-methods.yaml` contract by
`page.id: ecommerce-payment-methods`. Migrations 042/043 create durable
payment-method rows and deterministic Wire Transfer, Cash on Delivery, and
Card fixtures. The manifest adds the Configuration > Payment Methods menu.
Primary active methods now drive the checkout payment select and both
authenticated and guest checkout guards. Create/edit/archive/restore/delete
require `ecommerce.write`, reads require `ecommerce.read`, technical codes and
feature values are validated server-side, and row versions protect edits and
deletes.

Focused CRUD, permission declaration, validation, migration-rerun, checkout
selection, stale-write, and DuckDB restart tests pass. Authenticated Core3
desktop/mobile evidence and the exact authenticated Odoo `/shop` blocker are
recorded under
`evidence/ecommerce/2026-09-20/ecom-checkout-payment-methods-001/`. The paired
Odoo comparison is blocked because both supplied reference instances return
authenticated 404 for `/shop`; full Ecommerce sign-off remains open.

## Source trace

Reference: Odoo 19 `website_sale` addon in `/home/nhanjs/projects/odoo/addons/website_sale`.
`views/website_sale_menus.xml` defines `Website > Configuration > eCommerce`
(salesman group, sequence 20), with `Orders` (sequence 2) and `Products`
(sequence 3). Products contains Products, Pricelists, Categories, Attributes,
Combo Choices, Product Tags, and Product Ribbons; group-gated entries are
preserved in the trace. This batch implements the Products menu family.

The implemented entry is `menu_catalog_products` →
`product_template_action_website` in `views/product_views.xml`: action path
`ecommerce-products`, model `product.template`, view modes
`kanban,list,form,activity`, default Published filter, and website-specific
sequence ordering. The Core3 deliberate route alias is `/ecommerce/products`;
the exact action and menu labels remain visible in the Core3 eCommerce menu.

The newly implemented entry is `menu_product_combos` →
`product.product_combo_action` in `product/views/product_combo_views.xml`:
action path `combo-choices`, model `product.combo`, and list/form modes. The
Core3 route is `/ecommerce/combo-choices`; its YAML page/API split preserves
the Odoo menu/action contract while keeping option persistence in the
eCommerce-owned backend.

The same source file adds the website list columns for website sequence,
Categories, and Is Published. Core3 renders these alongside Product, Internal
Reference, Product Type, and Sales Price. The page is presentation-only and
joins `api/products.yaml` by `page.id`; permissions, queries, mutations, and
fixtures stay in the backend API/migration seam.

The settings section of the same source file also registers
`menu_ecommerce_payment_methods` → `payment.action_payment_method`. Core3 now
maps that action to the Ecommerce-owned Payment Methods configuration route and
uses its active primary rows as the checkout payment options; provider gateway
execution and token/transaction menus remain separate follow-up boundaries.

The same Website menu registers `menu_ecommerce_delivery` →
`delivery.action_delivery_carrier_form`, model `delivery.carrier`, with the
carrier list/form surface in `delivery/views/delivery_carrier_views.xml`.
Core3 maps this action to `/ecommerce/delivery-methods` through the separate
`services/ecommerce/pages/delivery-methods.yaml` and
`services/ecommerce/api/delivery-methods.yaml` contracts. Migrations 044/045
persist global and company-scoped carriers, active/archive state, delivery
type, pricing, Cash on Delivery capability, tracking, and description. The
checkout delivery option datasource and authenticated/guest guards now read
active carriers in the current company scope, including the Cash on Delivery
compatibility rule. External carrier-rate/shipment execution and destination
rule tables remain explicitly outside this bounded catalog slice.

## Bounded feature — Delivery Methods (`ECOM-CHECKOUT-DELIVERY-METHODS-001`)

The delivery carrier menu/action/model/list-form comparison above is captured
in `evidence/ecommerce/2026-09-20/ecom-checkout-delivery-methods-001/`.
Focused CRUD, permission, company-scope, validation, optimistic concurrency,
migration-rerun, checkout compatibility, and DuckDB restart tests pass (19
tests, 122 assertions); the full Ecommerce integration set passes (71 tests,
485 assertions across 21 files). The
authenticated Core3 desktop create/list and mobile list evidence shows the
durable `Browser Same Day` carrier with deterministic Standard Delivery,
Express Delivery, and Local Pickup fixtures. Authenticated Odoo desktop and
mobile captures on ports 8069 and 8073 show the exact `/shop` 404 blocker, so
the paired comparison and full Ecommerce sign-off remain open.

## Bounded order workflow — reorder

The next source-backed order slice follows
`/home/nhanjs/projects/odoo/addons/website_sale/controllers/reorder.py` and its
`CustomerPortal.my_orders_reorder` route. Odoo reads an accessible prior order,
skips lines that are not reorderable, adds eligible products and quantities to
the active cart, and raises a validation error when no line can be added.

Core3 implements this contract through the order-detail API/page join:
`ecommerce_order_lines` displays persisted source lines and
`reorder_ecommerce_order` selects the customer's existing open cart (or creates
the deterministic customer cart), merges quantities by product, and returns
the durable cart. The mutation enforces `ecommerce.write`, customer/company
scope, source row-version concurrency, missing-order, unavailable-product, and
empty-line guards. Migration `20260920130000-033-ecommerce-reorder-demo.yaml`
provides repeatable source-order lines, including an unavailable-product case.

## Acceptance and evidence

- Deterministic products: three published/one unpublished fixtures, ordered by
  website sequence; search, Published filter, empty state, and transport error
  state are declared and tested.
- `ecommerce.read` gates the page and query; `ecommerce.write` gates create and
  archive. Blank names and duplicate internal references are rejected.
- Visible Kanban/List tabs are used; mobile defaults to Kanban to match the
  Odoo action's product-first catalog surface. New, Archive, search, filter,
  row navigation, empty, and error states are covered by the page/API contract.
- Reorder coverage: active source lines merge into the owned open cart,
  repeated requests preserve Odoo's additive behavior, unavailable-only orders
  are rejected, wrong customer/company and stale/missing orders are denied,
  and selected cart lines survive a DuckDB restart.
- Required comparison captures were attempted under
  `/tmp/core3-odoo-parity/ecommerce-products-wave2/` for Odoo and Core3 at
  1440x900 and 390x844. On 2026-09-12 Odoo responded at `http://localhost:8073`
  (`/web/login` HTTP 200), but authenticated capture was not completed because
  the available browser automation runtime was unavailable in this session.
  Core3 capture was blocked before authentication: `bun run dev --db=ddb
  --memory` left the backend without a listener while Vite proxied to it
  (`ECONNREFUSED 127.0.0.1:3001`, then an explicit retry hit a stale mediator
  on 3012). After cleanup, the backend exited during YAML catalog loading on
  the unrelated pre-existing `sms_marketing.mailings.cancel` contract:
  `Named action sms_marketing.mailings.cancel permission does not match its
  workflow transition` in `packages/server/src/routes/yaml-api.ts:253`.
  No screenshot files were created and no visual-parity claim is made. Retry
  after repairing that baseline action and assigning distinct backend,
  frontend, and mediator ports.
