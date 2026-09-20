# ecommerce QA ledger

## Product Website Description (`ECOM-CATALOG-PRODUCT-WEBSITE-DESCRIPTION-001`, 2026-09-21)

- Odoo source/page: pass. `website_sale/models/product_template.py` defines
  HTML `website_description`; `controllers/main.py` includes it in description
  search; and `views/templates.xml` renders it after product detail content.
- Core3 lifecycle: pass for this bounded contract. Migrations 080/081 add
  durable website-description content and a deterministic Mug fixture.
  Products, Shop, and Product Detail use separate page/API YAML contracts;
  search includes the description and Product Detail exposes a rich-text edit
  field. Writes carry `ecommerce.write`, company, 10,000-character, script-tag,
  and optimistic concurrency guards.
- Focused verification: `bun test
  ./test/ecommerce_product_website_description.integration.test.ts --timeout
  20000` — **3 passed, 24 assertions, 0 failures**. Adjacent Product Detail,
  Shop, Product Variants, Cart, and Compare-Price tests passed **17 tests, 129
  assertions, 0 failures**; combined **20 passed, 153 assertions, 0 failures**.
  Paired Ecommerce page/API schema validation passed.
- UI audit: **blocked** by an unrelated Timesheets page schema error:
  `components[0].search.categories` and `components[0].search.or locations...`
  are rejected by the shared validator. No Timesheets files were changed.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Rich HTML rendering/sanitization parity, broader actor/browser coverage, and
  paired Odoo rendering remain open. Evidence:
  `evidence/ecommerce/2026-09-21/ecom-catalog-product-website-description-001/`.

## Product Compare-at Pricing (`ECOM-CATALOG-PRODUCT-COMPARE-PRICE-001`, 2026-09-21)

- Odoo source/page: pass. `website_sale/models/product_template.py` defines
  `compare_list_price`; `product_configurator.py` returns it only when it is
  above the actual price; and `product_views.xml` renders the Compare to Price
  field behind the Website Sale comparison group.
- Core3 lifecycle: pass for this bounded contract. Migrations 078/079 add
  durable product/variant compare prices and deterministic Mug/Mug Blue
  fixtures. Products, Shop, Product Detail, and Product Variant use separate
  page/API YAML contracts; raw values and the greater-than-only
  `compare_at_price` projection are exposed. Product and variant writes carry
  `ecommerce.write`, company, non-negative-value, and optimistic concurrency
  guards.
- Focused verification: `bun test
  ./test/ecommerce_product_compare_price.integration.test.ts --timeout 20000` —
  **3 passed, 33 assertions, 0 failures**. UI audit: **pass** — 701 pages,
  710 routes, 1328 datasources.
- Adjacent Products, Product Detail, Product Variants, Shop, and Cart
  regression: **16 passed, 118 assertions, 0 failures**; combined bounded
  set: **19 passed, 151 assertions, 0 failures**. Scoped ESLint and
  `git diff --check`: **pass**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Currency/pricelist display integration, broader actor/browser coverage, and
  paired Odoo rendering remain open. Evidence:
  `evidence/ecommerce/2026-09-21/ecom-catalog-product-compare-price-001/`.

## Product Variant Base-Unit Pricing (`ECOM-CATALOG-VARIANT-BASE-UNIT-PRICING-001`, 2026-09-21)

- Odoo source/page: pass. `website_sale/models/product_product.py` and
  `product_template.py` define base-unit count, custom unit, derived unit
  price, and unit name; the combination response returns `base_unit_price`; and
  `product_views.xml` renders the fields and Price Per Unit in the variant
  form. A zero count hides the derived price.
- Core3 lifecycle: pass for this bounded contract. Migrations 076/077 add
  durable variant base-unit count/name metadata and a deterministic Mug Blue
  fixture. Separate Product Detail and Product Variant API/page YAML expose
  the derived price and a permissioned configuration action with company,
  non-negative count, unit-name length, and optimistic concurrency guards.
- Focused verification: `bun test
  ./test/ecommerce_variant_base_units.integration.test.ts --timeout 20000` —
  **3 passed, 27 assertions, 0 failures**. Adjacent Product Variant, Product
  Detail, and Cart tests added **11 passed, 71 assertions**; combined **14
  passed, 98 assertions, 0 failures**.
- UI audit: **pass** — 699 pages, 708 routes, 1321 datasources. Scoped ESLint
  and `git diff --check`: **pass**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Browser actor coverage, paired Odoo rendering, currency/UoM integration,
  and broader module gates remain open. Evidence:
  `evidence/ecommerce/2026-09-21/ecom-catalog-variant-base-unit-pricing-001/`.

## Product Variant Extra Media (`ECOM-CATALOG-VARIANT-EXTRA-MEDIA-001`, 2026-09-21)

- Odoo source/page: pass. `website_sale/models/product_image.py` defines
  `product_variant_id`; `product_product.py` exposes
  `product_variant_image_ids` and includes variant images in `_get_images()` and
  the extra-image URLs; `product_views.xml` renders “Extra Variant Media”; and
  `controllers/variant.py` returns the selected variant carousel.
- Core3 lifecycle: pass for this bounded contract. Migrations 074/075 add
  durable variant-scoped image metadata and a deterministic Mug Blue fixture.
  Separate Product Variant API/page YAML lists media and exposes permissioned
  image upload/removal with active/product/company, MIME/size, duplicate, and
  optimistic row-version guards. Product Detail opens the dedicated variant
  page. Video URLs and external media processing remain out of scope.
- Focused verification: `bun test
  ./test/ecommerce_product_variant_images.integration.test.ts --timeout 20000`
  — **3 passed, 33 assertions, 0 failures**. Adjacent Product Detail,
  Variant, and Cart tests added **11 passed, 71 assertions**; combined **14
  passed, 104 assertions, 0 failures**.
- UI audit: **pass** — 697 pages, 706 routes, 1317 datasources. Scoped ESLint
  and `git diff --check`: **pass**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Browser actor coverage, paired Odoo rendering, video/external media, and
  broader module gates remain open. Evidence:
  `evidence/ecommerce/2026-09-21/ecom-catalog-variant-extra-media-001/`.

## Product Optional Recommendations (`ECOM-CATALOG-PRODUCT-OPTIONALS-001`, 2026-09-21)

- Odoo source/page: pass. `sale/models/product_template.py` defines
  `optional_product_ids`; Sale and Website Sale product configurator routes
  return `optional_products`; and the product template view describes these as
  recommendations when adding to cart or quotation.
- Core3 lifecycle: pass for this bounded contract. Migrations 072/073 add
  durable ordered company-scoped assignments and deterministic Mug → Lamp /
  Chair → Mug fixtures. Separate Product Detail API/page YAML exposes
  published same-company optionals, permissioned assignment/removal, and an
  optional-to-cart mutation with self-target, publication, company, duplicate,
  cart ownership, idempotency, and optimistic stale guards.
- Focused verification: `bun test
  ./test/ecommerce_product_optionals.integration.test.ts --timeout 20000` —
  **3 passed, 25 assertions, 0 failures**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Browser actor coverage, paired Odoo rendering, and external checkout gates
  remain open. Evidence:
  `evidence/ecommerce/2026-09-21/ecom-catalog-product-optionals-001/`.

## Checkout Customer Addresses (`ECOM-CHECKOUT-CUSTOMER-ADDRESS-001`, 2026-09-21)

- Odoo source/page: pass. `controllers/main.py` supplies `/shop/address`,
  `shop_address_submit`, and `shop_update_address`; `res_partner.py` extends
  frontend-writable address fields; `templates.xml` renders Address Management
  and the address-on-checkout surface.
- Core3 lifecycle: pass for this bounded contract. Migrations 070/071 add
  durable customer/company-scoped billing and delivery addresses. Checkout
  page/API YAML exposes saved-address selection plus permissioned create,
  update, and archive actions with required-field, type, duplicate, ownership,
  company, and optimistic stale guards; selected values are persisted into the
  order shipping address.
- Focused verification: `bun test
  ./test/ecommerce_checkout_customer_address.integration.test.ts
  ./test/ecommerce_checkout.integration.test.ts
  ./test/ecommerce_checkout_payment_token.integration.test.ts
  ./test/ecommerce_cart.integration.test.ts --timeout 20000` — **21 passed,
  136 assertions, 0 failures**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Browser actor coverage, paired Odoo rendering, and external payment/delivery
  gates remain open. Evidence: `evidence/ecommerce/2026-09-21/ecom-checkout-customer-address-001/`.

## Product Accessories (`ECOM-CATALOG-PRODUCT-ACCESSORIES-001`, 2026-09-21)

- Odoo source/page: pass. `product_template.py` supplies
  `accessory_product_ids` and `_get_website_accessory_product()`;
  `sale_order.py` computes `_cart_accessories()` from cart products, and
  `product_views.xml` exposes “Suggested accessories in the eCommerce cart”.
- Core3 lifecycle: pass for this bounded contract. Migrations 068/069 add
  durable ordered assignments and deterministic Mug → Lamp / Chair → Setup
  fixtures. Product Detail assignment/removal and Cart recommendation/add
  actions are separate YAML API/page contracts, with publication, company,
  duplicate, ownership, idempotency, and optimistic stale guards.
- Focused verification: `bun test
  ./test/ecommerce_product_accessories.integration.test.ts --timeout 20000` —
  **3 passed, 27 assertions, 0 failures**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Browser actor coverage, paired Odoo rendering, and external checkout gates
  remain open. Evidence: `evidence/ecommerce/2026-09-21/ecom-catalog-product-accessories-001/`.

## Product Alternatives (`ECOM-CATALOG-PRODUCT-ALTERNATIVES-001`, 2026-09-21)

- Odoo source/page: pass. `product_template.py` supplies
  `alternative_product_ids` and `_get_website_alternative_product()`;
  `templates.xml` renders the Alternative Products recommended section.
- Core3 lifecycle: pass for this bounded contract. Migrations 066/067 add
  durable ordered source/destination assignments and Mug → Chair/Lamp
  fixtures. The separate Product Detail API/page exposes published
  same-company recommendations plus `ecommerce.write` assign/remove actions
  with company, self-target, publication, duplicate, and optimistic stale
  guards.
- Focused verification: `bun test
  ./test/ecommerce_product_alternatives.integration.test.ts --timeout 20000` —
  **3 passed, 22 assertions, 0 failures**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Broader actor/browser coverage and paired Odoo rendering remain gates.

## Checkout Payment Token Selection (`ECOM-CHECKOUT-PAYMENT-TOKEN-SELECTION-001`, 2026-09-21)

- Odoo source/payment flow: pass. The payment form exposes customer-owned
  `tokens_sudo`; Website Sale accepts `flow == 'token'` and includes the sale
  order in transaction creation; `payment.transaction` persists `token_id`.
- Core3 lifecycle: pass for this bounded contract. Migration 065 adds the
  transaction token link/index; the separate checkout page/API exposes active,
  verified, provider-enabled customer tokens; authenticated checkout guards
  customer/company/provider/payment-method ownership and stores
  `offline_token`; guest checkout cannot use a saved token.
- Focused verification: `bun test
  ./test/ecommerce_checkout_payment_token.integration.test.ts
  ./test/ecommerce_checkout.integration.test.ts
  ./test/ecommerce_payment_tokens.integration.test.ts
  ./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000`
  — **23 passed, 134 assertions, 0 failures**.
- Scoped ESLint and `git diff --check`: **pass**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Live provider/gateway/token charging, broader actor/browser coverage, and
  paired Odoo rendering remain gates.

## Wishlist Session Merge (`ECOM-CATALOG-WISHLIST-MERGE-001`, 2026-09-21)

- Odoo source/login hook: pass. `product_wishlist.py` removes duplicate
  session products, assigns remaining rows to the logged-in partner, and pops
  `wishlist_ids`; `res_users.py` invokes the merge during login.
- Core3 lifecycle: pass for this bounded contract. Migration 064 provides a
  deterministic anonymous session fixture; the separate wishlist API action
  validates permission, company/customer/session ownership, and optimistic
  row-version state, transfers unique published items, consumes the session,
  and safely replays after consumption. The action is the Ecommerce-owned
  contract; shared auth event wiring remains open.
- Focused verification: `bun test
  ./test/ecommerce_wishlist_merge.integration.test.ts --timeout 20000` — **3
  passed, 19 assertions, 0 failures**.
- Browser: authenticated Core3 desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Auth-event binding, broader actor/browser coverage, and paired Odoo rendering
  remain gates.

## Wishlist Lifecycle (`ECOM-CATALOG-WISHLIST-001`, 2026-09-21)

- Odoo source/menu: pass. The supplied `website_sale_wishlist` model enforces
  unique product/partner ownership and filters unpublished products; its
  controller exposes public add/list/remove/product-ID routes and its template
  injects product-card/detail/cart controls.
- Core3 lifecycle: pass for this bounded contract. Migrations 062/063,
  separate page/API YAML, customer and anonymous owner rows, deterministic
  fixture, cookie public routes, product/variant/company/publication guards,
  duplicate replay, optimistic removal, and restart persistence are present.
- Focused verification: `bun test ./test/ecommerce_wishlist.integration.test.ts`
  — **4 passed, 31 assertions, 0 failures**.
- UI audit: **pass** — 690 pages, 699 routes, 1284 datasources. Scoped ESLint
  and `git diff --check` pass.
- Browser: Core3 authenticated desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  Login session merge, broader actor/browser coverage, and paired Odoo
  rendering remain gates.

## Payment Token Lifecycle (`ECOM-CHECKOUT-PAYMENT-TOKENS-001`, 2026-09-20)

- Odoo source/menu: pass. `menu_ecommerce_payment_tokens` maps to
  `payment.action_payment_token` and is technical-only; the supplied token
  views are read-only and expose masked details, partner, method, provider,
  reference, company, and archived filtering.
- Core3 lifecycle: pass for this bounded contract. Migrations 059/060/061,
  separate page/API YAML, deterministic masked fixture, idempotent provider
  registration, provider/method/customer/company validation, ownership query,
  and optimistic retirement are present.
- Focused verification: `bun test ./test/ecommerce_payment_tokens.integration.test.ts`
  — **4 passed, 27 assertions, 0 failures**.
- UI audit: **pass** — 688 pages, 697 routes, 1282 datasources. Scoped ESLint
  and `git diff --check` pass.
- Browser: Core3 authenticated desktop/mobile capture is **blocked** because
  ports 3000/4312/4313 were unavailable; no rendered UI pass is claimed.
- Odoo: exact `/shop` probes on ports 8069 and 8073 returned HTTP 404, so the
  authenticated paired desktop/mobile comparison is **blocked**.
- QA decision: bounded slice verified, Ecommerce module sign-off remains open.
  External gateway token creation, credential installation, raw-secret safety,
  checkout token selection, broader actor/company browser coverage, and paired
  Odoo evidence remain gates.

## Payment Provider Configuration (`ECOM-CHECKOUT-PAYMENT-PROVIDERS-001`, 2026-09-20)

- Odoo source comparison: `menu_ecommerce_payment_providers` opens
  `payment.action_payment_provider`, model `payment.provider`; the supplied
  model and views define company/state/publication, provider code, payment
  methods, tokenization, capture, express checkout, refund, availability, and
  status-dependent form controls.
- Core3 lifecycle: migrations 057/058 add durable company-scoped providers
  and deterministic Core3 Offline/Demo Gateway fixtures. The separate
  `payment-providers` page/API exposes `ecommerce.read` sources and
  `ecommerce.write` create/edit/disable/restore actions with code, state,
  feature, amount, company, duplicate, and row-version guards.
- Focused verification: `bun test
  ./test/ecommerce_payment_providers.integration.test.ts
  ./test/ecommerce_payment_methods.integration.test.ts
  ./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000` —
  **10 passed, 65 assertions, 0 failures**.
- UI audit: **687 pages, 696 routes, 1278 datasources**, passed. Scoped
  ESLint and `git diff --check` are recorded with the commit handoff.
- Core3 desktop/mobile capture is blocked by the dev backend/runtime boundary
  recorded in `../evidence/ecommerce/2026-09-20/ecom-checkout-payment-providers-001/browser-check.md`.
- Odoo paired comparison is blocked: `/shop` returned exact HTTP 404 on ports
  8069 and 8073. QA disposition: **bounded implementation verified, not
  signed off**; credentials, installation, token, gateway, and paired Odoo
  gates remain open.

## Payment Transaction Lifecycle (`ECOM-CHECKOUT-PAYMENT-TRANSACTIONS-001`, 2026-09-20)

- Odoo source comparison: `menu_ecommerce_payment_transactions` opens
  `payment.action_payment_transaction`, model `payment.transaction`; the
  supplied model and views define unique reference, provider/payment method,
  company, amount/currency, customer, provider reference, status, and
  technical list/form actions.
- Core3 lifecycle: migrations 055/056 add durable transaction schema and a
  deterministic confirmed fixture. Authenticated and guest checkout create a
  single pending transaction with a unique order/idempotency key. The
  separate `payment-transactions` page/API provides company-scoped reads and
  `ecommerce.write` state transitions with allowed-state, provider-reference,
  and optimistic row-version guards.
- Focused verification: `bun test
  ./test/ecommerce_payment_transactions.integration.test.ts
  ./test/ecommerce_checkout.integration.test.ts
  ./test/ecommerce_payment_methods.integration.test.ts --timeout 20000` —
  **19 passed, 114 assertions, 0 failures**.
- UI audit: **686 pages, 695 routes, 1272 datasources**, passed. Scoped
  ESLint and `git diff --check` are recorded with the commit handoff.
- Core3 authenticated desktop/mobile capture was attempted but blocked by
  backend startup: frontend `/api/modules` and route loads returned HTTP 502
  because backend port 4312 refused connections. No browser sign-off is
  claimed.
- Authenticated Odoo comparison is blocked: `/shop` returned exact HTTP 404
  on ports 8069 and 8073. QA disposition: **bounded implementation verified,
  not signed off**; live provider/token/capture/refund and paired Odoo gates
  remain open.

## Variant Configurator Cart Resolution (`ECOM-CATALOG-VARIANT-CONFIGURATOR-001`, 2026-09-20)

- Odoo source comparison: `website_sale/controllers/variant.py` exposes the
  public combination resolver and delegates selected combinations to the
  concrete `product.product`; the supplied product/website_sale models provide
  possible-variant and variant combination resolution.
- Core3 lifecycle: `api/product-detail.yaml` and
  `pages/product-detail.yaml` remain joined by `page.id`; the variant row
  action requires `ecommerce.write`, validates active/published/company scope,
  and writes variant identity/name/price to a durable cart line. Migration
  054 preserves prior lines and makes `(cart, product, variant)` the durable
  idempotency boundary. The public route carries `variant_id` and the public
  YAML mutation applies the same validation.
- Focused verification: `bun test
  ./test/ecommerce_variant_configurator.integration.test.ts
  ./test/ecommerce_cart.integration.test.ts
  ./test/ecommerce_product_variants.integration.test.ts --timeout 20000` —
  **9 passed, 57 assertions, 0 failures**.
- Core3 authenticated desktop/mobile evidence is blocked by the unrelated
  Inventory discovery error `actions[0].title is not allowed`; the blocker is
  recorded in `../evidence/ecommerce/2026-09-20/ecom-catalog-variant-configurator-001/browser-check.md`.
- Authenticated Odoo comparison is blocked: `/shop` returned exact HTTP 404
  on ports 8069 and 8073. QA disposition: **bounded implementation verified,
  not signed off**.

## Product Export (`ECOM-CATALOG-PRODUCT-EXPORT-001`, 2026-09-20)

- Odoo source comparison: `product_template_action_website` owns the Website
  Products kanban/list/form action; the standard list surface supplies the
  read-only Export affordance over visible product rows.
- Core3 lifecycle: the Products page/API remain separated by `page.id`; the
  new `ecommerce.read` client action exports stable, escaped CSV from the
  company-scoped durable product datasource without mutating rows.
- Focused verification: `bun test
  test/ecommerce_product_export.integration.test.ts` — **2 passed, 16
  assertions, 0 failures**. The test covers permission, company isolation,
  deterministic replay, row-version visibility, migration reapply, and
  restart persistence.
- Browser verification is blocked by unrelated shared Inventory discovery
  failure: `actions[0].title is not allowed`. The temporary runtime was
  removed and no shared Inventory files were staged.
- Odoo `/shop` returned exact HTTP 404 on ports 8069 and 8073; paired visual
  comparison is blocked. QA disposition: **bounded implementation verified,
  not signed off**.

## Product Tag Images (`ECOM-CATALOG-PRODUCT-TAG-IMAGE-001`, 2026-09-20)

- Odoo source comparison: `product.tag.image` is a bounded image field with
  200x200 limits, visible in the customer-visible tag form/list; website_sale
  renders the image before its color/name fallback.
- Core3 lifecycle: migrations 052/053 add durable tag-image metadata and
  deterministic fixture stability; the list opens a separate tag-detail page,
  whose API owns the matching `page.id`, attachment datasource, upload and
  download actions, image-only/5 MB validation, replacement, permission, and
  row-version concurrency contract.
- Focused verification: `bun test
  test/ecommerce_product_tag_image.integration.test.ts` — **3 passed, 25
  assertions, 0 failures**. Coverage includes migration rerun, permission and
  invalid upload boundaries, replacement, stale upload rejection, download,
  and DuckDB restart bytes.
- Browser verification: authenticated Core3 desktop/mobile and authenticated
  Odoo `/shop` blocker captures are under
  `../evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-image-001/`.
- Odoo `/shop` returned exact HTTP 404 on ports 8069 and 8073; paired visual
  comparison is blocked. QA disposition: **bounded implementation verified,
  not signed off**.

## Product Tag Variant Assignments (`ECOM-CATALOG-PRODUCT-TAG-VARIANT-ASSIGNMENT-001`, 2026-09-20)

- Odoo source comparison: `product.tag.product_product_ids` is a distinct
  variant many-to-many relation with an attribute-bearing variant domain;
  `product_tag_views.xml` exposes the Product Variant field, and website_sale
  renders selected-variant tags in the combination response.
- Core3 lifecycle: migrations 050/051 add the durable tag/variant relation and
  deterministic Mug/Chair assignments. The API adds a variant option source,
  variant projection fields, and separate `ecommerce.write` assign/remove
  actions with active-combination, company, duplicate, missing, and stale-row
  guards. The page keeps the YAML/API split and exposes variant columns/actions.
- Focused verification: `bun test
  ./test/ecommerce_product_tags.integration.test.ts
  ./test/ecommerce_product_tag_variants.integration.test.ts --timeout 20000` —
  **8 passed, 50 assertions, 0 failures**. Isolated Ecommerce discovery audit:
  **19 pages, 20 routes, 51 datasources**.
- Browser verification: authenticated Core3 `admin@tms.local` desktop
  1440x900 tag list/assignment form and mobile 390x844 tag list captures are
  under `../evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-variant-assignment-001/`;
  no post-navigation page/request errors were recorded.
- Odoo comparison: authenticated `codex@core3.local` in
  `core3_codex_demo` reached both supplied references, but `/shop` returned
  exact HTTP 404 on ports 8069 and 8073 at desktop and mobile viewports.
- QA disposition: **bounded implementation verified, not signed off**.
  Odoo website/eCommerce, Product Tag image, broader actor/company browser,
  and full module gates remain open.

## Product Variants (`ECOM-CATALOG-PRODUCT-VARIANTS-001`, 2026-09-20)

- Odoo menu/action/source comparison: `product_variant_action` for
  `product.product`, website_sale variant list/form views, and the supplied
  `product_product.py`, `product_template_attribute_value.py`, and
  configurator controller were traced. Variant records resolve combinations
  and can contribute variant-specific prices to website sale.
- Core3 lifecycle: migrations 048/049 add durable variants, deterministic Mug
  and Chair fixtures, variant references on pricelist rules and cart lines,
  and an idempotent variant-specific Mug rule. Product detail page/API YAML
  remains separated by `page.id`; the variant datasource is read-protected
  and create/edit/delete mutations require `ecommerce.write`.
- Focused verification: `bun test
  ./test/ecommerce_product_variants.integration.test.ts
  ./test/ecommerce_cart.integration.test.ts --timeout 20000` — **6 passed,
  43 assertions, 0 failures**. The variant suite covers discovery contract,
  migration rerun, company/read scope, CRUD, duplicate combination/reference,
  negative-price validation, stale writes, restart persistence, and
  variant-specific cart pricing.
- Browser verification: authenticated Core3 `admin@tms.local` desktop
  1440x900 product detail/variant form and mobile 390x844 detail captures are
  under `../evidence/ecommerce/2026-09-20/ecom-catalog-product-variants-001/`;
  post-navigation page/request errors were empty.
- Odoo comparison: authenticated `codex@core3.local` in
  `core3_codex_demo` reached both supplied references, but `/shop` returned
  exact HTTP 404 on ports 8069 and 8073 at desktop and mobile viewports.
  Paired comparison is blocked by the supplied reference database.
- QA disposition: **bounded implementation verified, not signed off**.
  Full Ecommerce sign-off remains open for the working Odoo Website/eCommerce
  surface, configurator/media/currency follow-ups, broader actor/company
  browser coverage, and module-level workflows.

## Pricelist Rules (`ECOM-CATALOG-PRICELIST-RULES-001`, 2026-09-20)

- Odoo menu/action/source comparison: Website > Configuration > eCommerce >
  Products > Pricelists, `product.product_pricelist_action2`, and
  `product.pricelist.item` list/form target, date, quantity, and fixed/
  percentage/formula fields were traced in the supplied source.
- Core3 lifecycle: migrations 046/047 add durable rule metadata and
  deterministic fixture upgrades; page/API YAML is separated by `page.id`;
  rule option sources, permissioned CRUD, target/date/value/duplicate guards,
  company scope, stale row-version protection, and cart price application are
  implemented.
- Focused verification: `bun test
  test/ecommerce_pricelist_rules.integration.test.ts
  test/ecommerce_cart.integration.test.ts --timeout 20000` — **6 passed,
  40 assertions, 0 failures**. Full module counts and audit/lint results are
  recorded with the commit handoff.
- Browser verification: authenticated Core3 desktop/mobile detail, rule form,
  company-boundary attempt, and Odoo 404 blocker captures are under
  `../evidence/ecommerce/2026-09-20/ecom-catalog-pricelist-rules-001/`.
- Odoo `/shop` returned exact HTTP 404 on ports 8069 and 8073; paired visual
  comparison is blocked. True product-variant pricing is also open because
  this catalog has no separate variant table.
- QA disposition: **bounded implementation verified, not signed off**.
  Ecommerce module sign-off remains open for the paired Website/eCommerce
  reference, broader actor/company browser matrix, and external pricing gates.

## Delivery Methods (`ECOM-CHECKOUT-DELIVERY-METHODS-001`, 2026-09-20)

- Odoo menu/action/source comparison: `menu_ecommerce_delivery` /
  `delivery.action_delivery_carrier_form`, model `delivery.carrier`, ordered
  carrier list/form fields, company scope, active state, delivery type,
  pricing, tracking, description, and Cash on Delivery capability were
  verified against the supplied `website_sale` and `delivery` source.
- Core3 lifecycle: migrations 044/045 add durable global/company-scoped
  delivery methods and deterministic Standard Delivery, Express Delivery, and
  Local Pickup fixtures; page/API YAML is separated by `page.id`; the
  Configuration menu, search/active/type filters, checkout option source,
  permissioned CRUD, archive/restore/delete, validation, Cash on Delivery
  compatibility, and stale row-version guards are implemented.
- Focused verification: `bun test
  test/ecommerce_delivery_methods.integration.test.ts
  test/ecommerce_checkout.integration.test.ts
  test/ecommerce_actor_matrix.integration.test.ts --timeout 20000` — **19
  passed, 122 assertions, 0 failures**. The full Ecommerce integration set
  (`test/ecommerce*.integration.test.ts`, 21 files) also passes with **71
  tests, 485 assertions, 0 failures**.
- Browser verification: authenticated Core3 desktop 1440x900 list/form/post-
  create and mobile 390x844 list captures are in
  `../evidence/ecommerce/2026-09-20/ecom-checkout-delivery-methods-001/`;
  desktop created durable `Browser Same Day`, and Core3 page/request errors
  were empty.
- Odoo authentication succeeded as `codex@core3.local` against
  `core3_codex_demo` on ports 8069 and 8073 at both viewports. Authenticated
  `/shop` returned the exact 404 on both, so paired Delivery Methods comparison
  is blocked.
- QA disposition: **bounded implementation verified, not signed off**. Full
  Ecommerce sign-off remains open for paired Odoo, broader actor/company
  browser coverage, and external carrier-rate/shipment integration.

## Payment Methods (`ECOM-CHECKOUT-PAYMENT-METHODS-001`, 2026-09-20)

- Odoo menu/action/source comparison: `menu_ecommerce_payment_methods` /
  `payment.action_payment_method`, model `payment.method`, primary-method
  domain, active/sequence/name ordering, list/kanban/form fields, provider and
  feature support were verified against the supplied `payment` source.
- Core3 lifecycle: migrations 042/043 add durable payment methods and
  deterministic fixtures; page/API YAML is separated by `page.id`; the
  Configuration menu, search/active filter, checkout option source, permissioned
  CRUD, archive/restore/delete, code/feature validation, and stale row-version
  guards are implemented. Checkout now validates against active primary rows.
- Focused verification: `bun test
  test/ecommerce_payment_methods.integration.test.ts
  test/ecommerce_checkout.integration.test.ts
  test/ecommerce_actor_matrix.integration.test.ts --timeout 20000` — **19
  passed, 120 assertions, 0 failures**. Audit, targeted ESLint, and
  `git diff --check` are recorded with the bounded commit verification.
- Browser verification: authenticated Core3 desktop 1440x900 list/form/post-
  create and mobile 390x844 list captures are in
  `../evidence/ecommerce/2026-09-20/ecom-checkout-payment-methods-001/`;
  desktop created active `Browser Wallet` and the checkout option source is
  durable. Core3 browser page/request errors were empty.
- Odoo authentication succeeded as `codex@core3.local` against
  `core3_codex_demo` on ports 8069 and 8073 at both viewports. Authenticated
  `/shop` returned exact 404 on both, so paired Payment Methods comparison is
  blocked.
- QA disposition: **bounded implementation verified, not signed off**. Full
  Ecommerce sign-off remains open for the paired Odoo surface, broader actor/
  company browser matrix, and external provider/token/transaction gates. The
  bounded implementation commit is reported in the handoff and is local only.

## Product Attributes (`ECOM-CATALOG-PRODUCT-ATTRIBUTES-001`, 2026-09-20)

- Odoo menu/action/source comparison: `menu_product_attribute_action` /
  `product.attribute_action`, model `product.attribute`, attribute values,
  variant creation/display modes, eCommerce filter visibility, product-card
  preview, and thumbnail controls verified against the supplied source.
- Core3 lifecycle: migrations 038/039 add durable attributes and values with
  deterministic Color, Size, and Material fixtures; page/API YAML is joined by
  `page.id`; search/filter/empty/error states, permissioned CRUD, newline value
  parsing, and relation cleanup are implemented. Guards cover duplicate names,
  invalid options, multi-checkbox variant incompatibility, preview constraints,
  and stale row versions.
- Focused verification: `bun test
  test/ecommerce_product_attributes.integration.test.ts --timeout 20000` —
  **4 passed, 31 assertions, 0 failures**. `bun run audit` passed with 670
  pages, 679 routes, and 1210 datasources. Targeted ESLint and
  `git diff --check` passed.
- Browser verification: authenticated Core3 desktop 1440x900 list/form/post-
  create and mobile 390x844 list captures are in
  `../evidence/ecommerce/2026-09-20/ecom-catalog-product-attributes-001/`; the
  UI created `Browser Finish Attribute` with Metal and Wood values. Core3
  browser page/request errors were empty.
- Odoo authentication succeeded as `codex@core3.local` against
  `core3_codex_demo` on ports 8069 and 8073 at both viewports. Authenticated
  `/shop` returned 404 on both, so paired Product Attributes comparison is
  blocked.
- QA disposition: **bounded implementation verified, not signed off**. Full
  Ecommerce sign-off remains open for the paired Odoo surface and existing
  module-level actor/company and checkout gates. Bounded commit: `d6485833`
  (local only, not pushed).

## Combo Choices (`ECOM-CATALOG-PRODUCT-COMBO-CHOICES-001`, 2026-09-20)

- Odoo menu/action/source comparison: `menu_product_combos` /
  `product.product_combo_action`, model `product.combo`, ordered list/form
  fields, nullable company, computed minimum combo price, product count,
  non-empty/unique option constraints, and non-combo product option rule
  verified against the supplied `product` and `website_sale` source.
- Core3 lifecycle: migrations 040/041 add durable combo and option rows with
  deterministic Workspace Essentials and Office Upgrade fixtures; page/API
  YAML is separated by `page.id`; the manifest menu, search/product lookup,
  empty/error states, company scope, permissioned CRUD, option validation,
  optimistic row-version guards, and relation cleanup are implemented.
- Browser repair: the authenticated Core3 company is `Core3 Demo Company`, and
  the shared YAML form renderer emits `textarea` fields as text inputs. The
  combo API preserves newline option input and accepts semicolon-separated
  option lines so the real form can persist multiple options without a bypass.
- Focused verification: `bun test
  test/ecommerce_combo_choices.integration.test.ts --timeout 20000` — **4
  passed, 30 assertions, 0 failures**. The affected Products menu assertion
  was repaired to include Combo Choices. The affected catalog regression suite
  then passed with **18 tests, 141 assertions**, and the authenticated actor
  matrix passed with **3 tests, 22 assertions**.
- Scoped audit: `bun run audit` passed with **671 pages, 680 routes, and 1216
  datasources**. Targeted ESLint and `git diff --check` passed after the final
  repair.
- Browser verification: authenticated Core3 desktop 1440x900 list/form/post-
  create and mobile 390x844 list captures are in
  `../evidence/ecommerce/2026-09-20/ecom-catalog-product-combo-choices-001/`;
  the desktop create interaction persisted `Browser Workspace Combo` with two
  product options under `Core3 Demo Company`.
  Core3 browser page/request errors were empty.
- Odoo authentication succeeded as `codex@core3.local` against
  `core3_codex_demo` on ports 8069 and 8073 at both viewports. Authenticated
  `/shop` returned 404 on both, so paired Combo Choices comparison is blocked.
- QA disposition: **bounded implementation verified, not signed off**. Full
  Ecommerce sign-off remains open for the paired Odoo surface and existing
  module-level actor/company and checkout gates. Bounded commit:
  `3e9a938bfc28` (local only, not pushed).

## Product Tags (`ECOM-CATALOG-PRODUCT-TAGS-001`, 2026-09-20)

- Odoo menu/action/source comparison: `product_catalog_product_tags` /
  `product.product_tag_action`, model `product.tag`, ordered list/form fields,
  unique tag name, customer visibility/color, and product-template/variant
  assignment surface verified against the supplied source.
- Core3 lifecycle: migrations 036/037 add durable tags and tag-product
  relations with deterministic fixtures; page/API YAML is separated by
  `page.id`; the manifest menu, search/filter/empty/error states, product
  assignment, `ecommerce.read`, and `ecommerce.write` CRUD are implemented.
  Guards cover duplicate names, invalid colors, stale row versions, and
  relation cleanup.
- Focused verification: `bun test
  test/ecommerce_product_tags.integration.test.ts --timeout 20000` — **4
  passed, 30 assertions, 0 failures**. `bun run audit` passed with 669 pages,
  678 routes, and 1203 datasources. Targeted ESLint and `git diff --check`
  passed.
- Browser verification: authenticated Core3 desktop 1440x900 list/form/post-
  create and mobile 390x844 list captures are in
  `../evidence/ecommerce/2026-09-20/ecom-catalog-product-tags-001/`; the UI
  created `Browser Catalog Tag Verified` and assigned Core3 Ceramic Mug. Core3 browser
  page/request errors were empty.
- Odoo authentication succeeded as `codex@core3.local` against
  `core3_codex_demo` on ports 8069 and 8073 at both viewports. Authenticated
  `/shop` returned 404 on both, so paired Product Tags comparison is blocked.
- QA disposition: **bounded implementation verified, not signed off**. Full
  Ecommerce sign-off remains open for the paired Odoo surface and existing
  module-level actor/company and checkout gates. The optional Odoo tag image and
  variant-only assignment fields are recorded as follow-up gaps in the module
  plan. Bounded commit: `4b14f8ff` (local only, not pushed).

## Product Ribbons (`ECOM-CATALOG-RIBBONS-001`, 2026-09-20)

- Odoo menu/action/source comparison: `product_catalog_product_ribbons` /
  `website_sale.product_ribbon_action`, model `product.ribbon`, list/form
  fields and automatic `sale`/`new` uniqueness constraint verified against the
  supplied `website_sale` source.
- Core3 lifecycle: durable schema and deterministic four-row demo migration,
  separate page/API YAML contracts, manifest menu, `ecommerce.read` page/query
  boundary, `ecommerce.write` CRUD mutations, validation, assignment
  uniqueness, optimistic row-version guards, and restart persistence are
  implemented.
- Focused verification: `bun test
  test/ecommerce_product_ribbons.integration.test.ts --timeout 20000` — **4
  passed, 28 assertions, 0 failures**. The test covers CRUD, permission/error
  declarations, migration idempotency, deterministic fixtures, and DuckDB
  restart persistence.
- Browser verification: Core3 authenticated desktop 1440x900 and mobile
  390x844 list captures plus desktop create-form/post-create captures are in
  `../evidence/ecommerce/2026-09-20/ecom-catalog-ribbons-001/`; the desktop
  create interaction persisted `Browser QA Ribbon`, and the captured browser
  check has no Core3 page/request errors. `bun run audit` passed with 668 pages,
  677 routes, and 1196 datasources.
- Odoo authentication succeeded as `codex@core3.local` against
  `core3_codex_demo` on ports 8069 and 8073 at both viewports. The authenticated
  `/shop` route returned 404 on both, confirming the supplied reference lacks
  Website/eCommerce; the paired Odoo Product Ribbon comparison is blocked.
- QA disposition: **bounded implementation verified, not signed off**. Full
  Ecommerce sign-off remains open for the paired Odoo surface and existing
  module-level actor/company and workflow gates.

## Bounded reorder workflow (2026-09-20)

- Source trace: Odoo 19 `website_sale/controllers/reorder.py`,
  `CustomerPortal.my_orders_reorder`; it copies eligible prior-order lines into
  the active cart and rejects an order with nothing reorderable.
- Core3 implementation: order-detail `ecommerce_order_lines` datasource and
  `reorder_ecommerce_order` API/page action, with durable line fixtures and
  customer/company ownership, stale, missing, and unavailable-product guards.
- Focused evidence: `bun test test/ecommerce_reorder.integration.test.ts
  test/ecommerce_orders.integration.test.ts test/ecommerce_cart.integration.test.ts
  --timeout 20000` — **8 passed, 48 assertions, 0 failures**.
- Targeted lint (`bunx eslint test/ecommerce_reorder.integration.test.ts`) and
  `git diff --check` passed.
- Repository audit was attempted but remains blocked by an unrelated existing
  Inventory page definition: duplicate `back_to_inventory_package` action and
  disallowed `label` at `services/inventory/pages/package-detail.yaml`.
- Paired Odoo visual/authenticated comparison remains outside this bounded
  source/API slice; no visual-parity claim is made.

## Conditional review handoff — exact candidate `39ab71f` (2026-09-13)

- Private product/pricelist/order/pricelist-rule permission contracts: **PASS**,
  1 test / 25 assertions covering exact `ecommerce.read` plus 401/403 states.
- Audit (659/668/1,134), full CSS, frontend build, and diff-check passed.
- Conditional blockers preserved: repository ESLint has two unrelated Website
  errors; candidate browser runtime returned 503 and no candidate browser/actor
  evidence was obtained. Odoo `website_sale` is missing and `/shop` returns
  404, so paired comparison remains blocked.

Disposition: bounded permission-contract slice integrated conditionally; retain
unsigned-off eCommerce module status and all browser/Odoo/actor gates.

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
Candidate commit: `d9ea8e3c` (integrated from product `717cc3e8`; QA evidence `107e5a43`)

## DEV-4 bounded QA (2026-09-13, candidate `717cc3e8518554b5a3424648132679428a13b2c4`)

- Candidate identity verified in `agent/odoo-ecommerce-dev4-sales-handoff`; the user-supplied `/agent/` path segment is not a registered filesystem path.
- Focused command with the default timeout: **13 passed, 1 failed, 64 assertions**. The failure was the real local import test timing out at 5,000 ms.
- Focused rerun with `--timeout 20000`: **14 passed, 69 assertions, 0 failures**. The real local import took 12,552 ms, so default-timeout reproducibility remains a finding.
- Sales polling/claim/ack: pass. The consumer polls pending envelopes, does not call Sales after a stale claim, acknowledges only after a successful claim, records failure only after a successful claim, and imports one source-linked order and line idempotently on a repeated poll.
- YAML cross-module permissions: pass at contract level. Sales import order/line actions use `orders.write`, and the consumer calls declared eCommerce/Sales service operations. No authenticated HTTP actor/company matrix was established.
- Audit: pass — `bun run audit`: 659 pages, 668 routes, 1134 datasources. `git diff --check 717cc3e8^ 717cc3e8`: pass.
- Full regression: **not completed**; stopped at user request after partial execution. The partial run included eCommerce checkout passing, but also unrelated baseline failures/timeouts in Spreadsheet dashboard Share, Purchase Pricelists, Employees Settings, Purchase Units & Packagings, Live Chat Expertise, Accounting Sales, and Accounting Bills Analysis. No full-regression pass is claimed.
- Lint: fail — two `no-unsafe-optional-chaining` errors in unchanged `test/website_public.integration.test.ts` lines 31 and 33; neither file nor line is in this candidate.
- Authenticated checkout/browser: prior 2026-09-13 Core3 evidence remains applicable to the unchanged checkout surface: desktop 1440x900 and mobile 390x844 Shop → Cart → Checkout captures, successful desktop Confirm Order, and no console/page/request failures under `/tmp/core3-odoo-parity/ecommerce-checkout-20260913/`. No new browser capture was produced because the interactive Playwright kernel was unavailable.
- Paired Odoo: blocked. Authenticated Odoo had no Website/eCommerce launcher app and `/shop` returned HTTP 404; no `website_sale` reference database was available.
 - QA decision: **bounded slice not signed off**. Focused behavior passes only with the explicit timeout override; default focused execution, full regression, lint cleanliness, authenticated actor/company coverage, and paired Odoo evidence remain blockers.

## DEV-4 bounded slice (2026-09-13)

- Checkout now writes one `ecommerce_sales_handoffs` outbox row for each
  authenticated or guest order. The unique eCommerce order key makes the
  handoff idempotent.
- The owning Sales integration can read the order and lines through
  `ecommerce.sales.handoff.order` and `ecommerce.sales.handoff.lines`, claim a
  pending/failed row with an optimistic row version, and acknowledge it as
  `Succeeded` or `Failed`.
- Focused verification: `bun test ./test/ecommerce_checkout.integration.test.ts`
  — 11 passed, 59 assertions, 0 failures.
 - Integrated commit: `d9ea8e3c` (product source `717cc3e8`; QA source `107e5a43`).
- Sales consumer verification: `bun test ./test/ecommerce_sales_handoff_consumer.integration.test.ts` —
  3 tests, 10 assertions; real Sales migrations/YAML mutations create one
  source-linked order and line, repeated polling remains idempotent, and a stale
  claim never reaches Sales.
- Boundary: this proves the eCommerce-owned handoff contract and retry/stale
  guards, plus the bounded Sales-side consumer; it does not claim full module
  parity or paired Odoo parity.
- Commit: `717cc3e8` (QA ledger commit follows; review/merge is still required).

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
| ECOMMERCE-WF-021 | Payment/delivery durable boundary contract | YAML contract test plus Bun runtime smoke: SDK `1.23.0` worker reached `RUNNING`, workflow returned `Authorized/Ready`, timer recovery completed across worker restart, payment/delivery signals were accepted through the Bun callback client, callback activity deduplication passed, an authenticated checkout action in the real Core3 Ecommerce module runner emitted `ecommerce.checkout.confirmed` and the dispatcher started the workflow, deterministic provider failure exhausted five attempts and ran compensation, and shutdown reached `STOPPED` against temporary Temporal Server `1.31.2`; checkout contract suite 10 tests, 52 assertions | pass for Bun startup, workflow execution, timer recovery, callback delivery/deduplication, real Core3 event dispatch, retry exhaustion, compensation, shutdown, and local provider adapter contract; external provider certification and paired Odoo comparison remain open |
| ECOMMERCE-WF-022 | Sales handoff outbox claim, import, and acknowledgement | Checkout plus Sales consumer tests — eCommerce emits one pending envelope; the Sales consumer claims it, reads declared order/line operations, creates source-linked Sales records idempotently, and acknowledges success; stale claim is isolated | pass for isolated cross-module contract and local Sales persistence; full authenticated deployment and paired Odoo comparison remain open |

## R2 dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-ECOMMERCE-WAVE-20260913-R2` → `QA-ECOMMERCE-WAVE-20260913-R2` | existing `agent/odoo-ecommerce-dev4-sales-handoff` in `/home/nhanjs/projects/core3-worktrees/odoo-ecommerce-dev4-sales-handoff` | Authenticated customer/company boundary for cart, checkout, and order routes, including own/foreign/unauthenticated actors, 401/403 behavior, wrong-company isolation, and focused stale/forbidden mutation tests | dispatched in `8cc55885`; awaiting self-contained product commit before QA |

## 2026-09-13 bounded review — candidate `39ab71fd`

- Reviewed the existing self-contained Ecommerce permission-contract patch in
  `/home/nhanjs/projects/core3-worktrees/odoo-ecommerce-dev2` (`5` Ecommerce
  API/YAML/test files only: order detail, pricelists, products, and the focused
  permission test).
- Triggered/reconciled bounded QA evidence: `bun test
  ./test/ecommerce_permissions.integration.test.ts --timeout 20000` passed
  **1 test / 25 assertions**; `bun run audit` passed with **659 pages, 668
  routes, and 1134 datasources**; `git diff --check 39ab71fd^ 39ab71fd`
  passed.
- Disposition: **bounded conditional pass** for private-route 401/403
  contracts. Authenticated actor/company browser matrix, restart durability,
  external payment, and paired Odoo comparison remain open; Ecommerce is not
  signed off.

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
