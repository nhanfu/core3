# eCommerce parity — Products and order workflows

Status: qa-in-progress (bounded catalog product-variants slice; module sign-off remains open)

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
