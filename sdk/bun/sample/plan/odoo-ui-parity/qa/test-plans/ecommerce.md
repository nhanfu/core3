# Ecommerce detailed QA test plan

Module: ecommerce  
QA owner: ecommerce-qa  
Developer owner: ecommerce module owner  
Reference addon/version: website_sale, Odoo 19 Community  
Plan status: approved
Last reviewed: 2026-09-12

## ECOM-CHECKOUT-ORDER-ASSIGNMENT-001

- ECOM-FUNC-056: trace Website Sale Orders Assignment settings, default team,
  salesperson/team order boundary, and separate Core3 page/API contracts;
  verify deterministic team/person options and order projections.
- ECOM-WF-067: update the company assignment policy, snapshot it on
  authenticated and guest checkout orders, propagate the immutable snapshot to
  the Sales handoff, reject a converted-cart retry, and preserve state across
  migration replay and restart.
- ECOM-PERM-063: require `ecommerce.read` for policy/options/order reads and
  `ecommerce.write` for updates; reject foreign-company, inactive/unknown
  option, and stale writes without mutating durable state.
- ECOM-UI-049: render the Orders Assignment form at desktop and mobile and
  compare the authenticated Odoo settings surface; Core3 runtime is
  unavailable and Odoo `/shop` is HTTP 404 in the supplied references.

## ECOM-CHECKOUT-ABANDONED-CART-RECOVERY-001

- ECOM-FUNC-055: trace Odoo Website Sale's abandoned-cart menu/action,
  recovery template, delay and enablement settings, scheduled sender, and
  `action_recovery_email_send`; verify the Core3 page/API pairing.
- ECOM-WF-066: replay deterministic abandoned carts, enable recovery, select
  a valid template, send a recovery email once, expose the sent ledger, reject
  a repeat/stale send, and preserve policy and send state across migration
  replay and restart.
- ECOM-PERM-062: require `ecommerce.read` for policy/cart reads and
  `ecommerce.write` for policy updates and recovery sends; reject
  wrong-company, invalid-delay, invalid-template, disabled-policy, and stale
  writes without mutating state.
- ECOM-UI-048: render recovery policy controls and Abandoned Carts recovery
  state/action at desktop and mobile; Core3 browser and Odoo comparison remain
  blocked by runtime availability and `/shop` HTTP 404.

## ECOM-CHECKOUT-CONFIRMATION-EMAIL-TEMPLATE-001

- ECOM-FUNC-054: trace Odoo Website Sale's
  `confirmation_email_template_id` website field, sale-order model domain,
  Order Confirmation settings control, and `_get_confirmation_template()`
  override; verify the Core3 page/API pairing and order projections.
- ECOM-WF-065: replay deterministic sale-order template fixtures, select the
  Website Sale template, create authenticated and guest checkout orders with
  the selected template snapshot, and preserve policy/order state across
  migration replay and restart.
- ECOM-PERM-061: require `ecommerce.read` for policy reads and
  `ecommerce.write` for updates; reject wrong-company, inactive/missing
  template, and stale-row writes without changing the policy.
- ECOM-UI-047: render the Confirmation Email configuration and selected order
  template at desktop and mobile; Core3 browser and Odoo comparison remain
  blocked by runtime availability and `/shop` HTTP 404.

## ECOM-CHECKOUT-TAX-DISPLAY-MODE-001

- ECOM-FUNC-053: trace Odoo Website Sale's
  `show_line_subtotals_tax_selection` website field, settings relation/radio
  control, and subtotal tax-indication template; verify the Core3 page/API
  pairing and cart/checkout/public projections.
- ECOM-WF-064: replay the deterministic Tax Excluded fixture, switch to Tax
  Included and back, expose the selected subtotal contract in authenticated
  cart/checkout and the public anonymous-cart operation, and preserve the
  policy across migration replay and restart.
- ECOM-PERM-060: require `ecommerce.read` for policy reads and
  `ecommerce.write` for updates; reject wrong-company, unsupported-mode, and
  stale-row writes without changing policy state.
- ECOM-UI-046: render the Tax Display Policy form and selected checkout/cart
  subtotal indication at desktop and mobile; Core3 browser and Odoo
  comparison remain blocked by runtime availability and `/shop` HTTP 404.

This plan follows [`ecommerce.md`](../../ecommerce.md); executed evidence is
recorded in [`../ecommerce.md`](../ecommerce.md).

## ECOM-CHECKOUT-PAYMENT-TRANSACTION-POST-PROCESS-001

- ECOM-FUNC-052: trace the Website eCommerce Payment Transactions menu/action,
  Odoo `is_post_processed`, `action_post_process`, `_post_process`, and form
  visibility; verify the Core3 page/API pairing.
- ECOM-WF-063: replay the deterministic transaction, post-process it once,
  return the durable timestamp, reject repeat/stale requests, reset the flag
  on a later state transition, and preserve state across migration replay and
  restart.
- ECOM-PERM-059: require `ecommerce.read` for transaction reads and
  `ecommerce.write` for post-processing; reject wrong-company and concurrent
  writes without changing transaction state.
- ECOM-UI-045: render transaction post-processing status/action at desktop and
  mobile; Core3 browser and Odoo comparison remain blocked by runtime
  availability and `/shop` HTTP 404.

## ECOM-CHECKOUT-ADD-TO-CART-REDIRECT-001

- ECOM-FUNC-051: trace Odoo `website.add_to_cart_action`, the
  `cart_redirect_setting`, website session, cart service, and `/shop/cart/add`
  controller; verify the Core3 page/API pairing.
- ECOM-WF-062: replay the deterministic policy, switch Stay on Product Page to
  Go to cart and back, return redirect intent from authenticated and anonymous
  add-to-cart, and preserve the policy across migration replay and restart.
- ECOM-PERM-058: require `ecommerce.read` for policy reads and
  `ecommerce.write` for updates; reject wrong-company, unsupported-mode, and
  stale-row updates without changing policy state.
- ECOM-UI-044: render the Add to Cart Redirect form and resulting shop/cart
  intent at desktop and mobile; Core3 browser and Odoo comparison remain
  blocked by runtime availability and `/shop` HTTP 404.

## ECOM-CATALOG-ZERO-PRICE-SALE-POLICY-001

- ECOM-FUNC-050: trace Odoo zero-price setting, website fields,
  `hide_add_to_cart_setting`, `_is_add_to_cart_allowed`, cart controller, and
  Contact Us template; verify the Core3 page/API pairing.
- ECOM-WF-061: replay the deterministic policy, mark a zero-priced product
  contact-only, reject authenticated and anonymous add-to-cart, expose the
  Contact Us URL, allow the product when disabled, and preserve state across
  migration replay/restart.
- ECOM-PERM-057: require `ecommerce.read` for policy reads and
  `ecommerce.write` for updates; reject wrong-company, unsafe/invalid URL, and
  stale-row writes without changing policy state.
- ECOM-UI-043: render zero-price contact-only state and policy form at desktop
  and mobile; Core3 browser and Odoo comparison remain blocked by runtime
  availability and `/shop` HTTP 404.

## ECOM-CATALOG-SHOP-DEFAULT-SORT-001

- ECOM-FUNC-049: trace Odoo `website.shop_default_sort`, Website Shop
  menu/action, `_get_search_order`, template default-sort state, and Website
  Builder update route; verify the Core3 page/API pairing.
- ECOM-WF-060: replay the Featured fixture, update each supported sort mode,
  order the authenticated/public catalog deterministically, and preserve the
  selected mode across migration replay and restart.
- ECOM-PERM-056: require `ecommerce.read` for policy reads and
  `ecommerce.write` for updates; reject wrong-company, unsupported-mode, and
  stale-row updates without changing the current order policy.
- ECOM-UI-042: render the Shop Default Sort form and selected ordering at
  desktop and mobile; Core3 browser and Odoo comparison remain blocked by
  runtime availability and `/shop` HTTP 404.

## ECOM-CHECKOUT-ACCOUNT-POLICY-001

- ECOM-FUNC-048: trace Odoo `res.config.settings.account_on_checkout`, the
  website backing field, checkout registration setting, and template branches;
  pair the Core3 configuration page/API contracts.
- ECOM-WF-059: replay the deterministic company policy, switch Optional to
  Mandatory and Disabled, map signup mode, block anonymous mandatory checkout,
  allow optional guest checkout, and preserve the setting across restart.
- ECOM-PERM-055: require `ecommerce.read` for policy reads and
  `ecommerce.write` for updates; reject wrong-company, unsupported-mode, and
  stale-row writes without changing policy state.
- ECOM-UI-041: render the Checkout Account Policy form and mode selector at
  desktop and mobile; Core3 browser and Odoo comparison remain blocked by
  runtime availability and `/shop` HTTP 404.

## ECOM-CATALOG-PRODUCT-FEED-001

- ECOM-FUNC-047: trace Odoo `product.feed`, the GMC controller, list/form
  views, Product Feeds action, and Product Feed security group; pair the Core3
  Product Feeds page/API/public operation contracts.
- ECOM-WF-058: replay deterministic GMC 1 data, create a category-filtered
  feed, generate XML from published same-company products, invalidate its
  cache on edit, delete it, and preserve generated output across restart.
- ECOM-PERM-054: require `ecommerce.read` for feed reads and
  `ecommerce.write` for mutations; reject wrong-company, duplicate-name,
  invalid-selector, stale, and wrong-token access without mutating state.
- ECOM-UI-040: Product Feeds list/form, generated URL/cache state, and feed
  actions at desktop and mobile; Core3 browser and Odoo comparison remain
  blocked by runtime availability and `/shop` HTTP 404.

## ECOM-CATALOG-PRODUCT-WEBSITE-SEQUENCE-REORDER-001

- ECOM-FUNC-046: trace Odoo Website Products ordering/menu/handle behavior and
  pair the Products page/API contract.
- ECOM-WF-057: move deterministic products top, bottom, up, and down within
  the same published state; persist resulting order through restart.
- ECOM-PERM-053: require `ecommerce.write`; reject wrong-company, inactive,
  edge, and stale product sequence mutations without losing current order.
- ECOM-UI-039: Products list reorder actions and ordered catalog state at
  desktop and mobile; Core3 browser and Odoo comparison remain blocked by
  runtime availability and `/shop` HTTP 404.

## ECOM-CATALOG-PRODUCT-CATEGORY-ASSIGNMENT-001

- ECOM-FUNC-045: trace Odoo `public_categ_ids`, Website Products action, and
  category-aware search; verify Product Detail page/API separation.
- ECOM-WF-056: seed, assign, reorder, remove, query, and restart product
  Website Category assignments with deterministic fixtures.
- ECOM-PERM-052: require `ecommerce.write`; reject wrong-company products,
  inactive/cross-company categories, duplicate assignments, negative sequence,
  and stale relation writes.
- ECOM-UI-038: Product Detail category ListView and assignment form at desktop
  and mobile; Core3 browser and Odoo comparison remain blocked by runtime
  availability and `/shop` HTTP 404.

## ECOM-CATALOG-PRODUCT-DISPLAY-DIMENSIONS-001

- ECOM-FUNC-044: trace Odoo product display dimensions and pair Products,
  Shop, and Product Detail page/API contracts.
- ECOM-WF-055: seed, create, edit, query, and restart product display
  dimensions with deterministic values.
- ECOM-PERM-051: require `ecommerce.write`; reject wrong company, values
  outside 1–12, and stale row writes without changing the product.
- ECOM-UI-037: display width/height fields and catalog projections at desktop
  and mobile; Core3 browser and Odoo comparison remain blocked by runtime
  availability and `/shop` HTTP 404.

## ECOM-CATALOG-CATEGORY-WEBSITE-DESCRIPTION-001

- ECOM-FUNC-043: trace the Odoo category menu/action, HTML field, form, and
  shop template; verify Category Detail page/API separation.
- ECOM-WF-054: seed, edit, clear, and reload category website description.
- ECOM-PERM-050: require `ecommerce.write`; reject wrong company, inactive
  category, unsafe/over-length HTML, and stale row writes.
- ECOM-UI-036: Category Detail rich-text description field and action; desktop/
  mobile and Odoo comparison remain blocked by runtime availability and
  `/shop` HTTP 404.

## ECOM-CATALOG-PRODUCT-REVIEWS-001

- ECOM-FUNC-042: trace Odoo rating mixin, aggregates, and Customer Reviews
  template; verify Product Detail page/API separation.
- ECOM-WF-053: create pending review, publish/reject moderation, edit back to
  pending, and delete with aggregate refresh.
- ECOM-PERM-049: require `ecommerce.read`/`ecommerce.write`; reject wrong
  company, invalid rating/text, inactive product, and stale row writes.
- ECOM-UI-035: Product Detail review aggregate and review ListView with CRUD
  and moderation actions; desktop/mobile and Odoo comparison remain blocked by
  runtime availability and `/shop` HTTP 404.

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Products/shop | product and shop routes | Published catalog, product detail, search/filter and price-list scope |
| Product Ribbons | `/ecommerce/product-ribbons` / `ecommerce-product-ribbons` | Odoo product.ribbon list/form, deterministic defaults, automatic assignment uniqueness, CRUD and responsive configuration surface |
| Product Tags | `/ecommerce/product-tags` / `ecommerce-product-tags` | Odoo product.tag list/form, deterministic customer visibility/color, product assignment, CRUD and responsive configuration surface |
| Product Attributes | `/ecommerce/product-attributes` / `ecommerce-product-attributes` | Odoo product.attribute list/form, variant/display modes, eCommerce filter/preview controls, durable values, CRUD and responsive configuration surface |
| Combo Choices | `/ecommerce/combo-choices` / `ecommerce-combo-choices` | Odoo product.combo list/form, ordered product options, extra prices, company scope, computed minimum price, CRUD and responsive configuration surface |
| Pricelist Rules | `/ecommerce/pricelists/detail` / `ecommerce-pricelist-detail` | Odoo product.pricelist.item target, quantity/date, fixed/percentage/formula pricing, durable CRUD, company scope, cart application, and responsive detail/form surface |
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
| ECOM-FUNC-013 | Assets/import/export/print | Exercise product images/assets, catalog import/export and exposed print actions | product image upload/download, product import, and Products CSV export pass through persisted YAML/API paths; authenticated browser export remains blocked by shared Inventory discovery |
| ECOM-FUNC-014 | Sales handoff outbox | Checkout emits one idempotent handoff envelope; a Sales worker can claim it once, read the owned order/lines, and acknowledge success/failure with stale-write protection | pass: `ecommerce_checkout.integration.test.ts` — 11 tests, 59 assertions; migration, pending/order/line operations, claim, acknowledgement, duplicate-claim, and duplicate-acknowledgement behavior verified |
| ECOM-FUNC-015 | Product Ribbons | Product Ribbon fixtures, search/filter/empty/error states, permissioned CRUD, automatic assignment uniqueness, validation, stale guards, migration rerun, and restart persistence work | pass: `ecommerce_product_ribbons.integration.test.ts` — 4 tests, 28 assertions |
| ECOM-FUNC-016 | Product Tags | Tag fixtures, search/visibility filter/empty/error states, permissioned CRUD, product assignment, duplicate/name/color validation, migration rerun, relation cleanup, and restart persistence work | pass: `ecommerce_product_tags.integration.test.ts` — 4 tests, 30 assertions |
| ECOM-FUNC-017 | Product Attributes | Attribute fixtures, search/active filter/empty/error states, durable values, permissioned CRUD, option validation, migration rerun, and restart persistence work | pass: `ecommerce_product_attributes.integration.test.ts` — 4 tests, 31 assertions |
| ECOM-FUNC-018 | Combo Choices | Combo fixtures, product search, computed minimum price, empty/error states, permissioned CRUD, option validation, migration rerun, company scope, and restart persistence work | pass: `ecommerce_combo_choices.integration.test.ts` — 4 tests, 30 assertions |
| ECOM-FUNC-019 | Payment Methods | Durable primary payment-method fixtures, checkout option filtering, search/active states, permissioned CRUD, code/feature validation, archive workflow, migration rerun, and restart persistence work | pass: `ecommerce_payment_methods.integration.test.ts` — 4 tests, 32 assertions |
| ECOM-FUNC-020 | Delivery Methods | Durable global/company-scoped carrier fixtures, checkout option filtering, search/active/type states, permissioned CRUD, validation, Cash on Delivery compatibility, migration rerun, and restart persistence work | pass: `ecommerce_delivery_methods.integration.test.ts` — 4 tests, 34 assertions |
| ECOM-FUNC-021 | Pricelist Rules | Durable target/pricing metadata, deterministic fixtures, permissioned CRUD, target/date/value/duplicate validation, stale writes, migration rerun, restart persistence, and cart fixed/percentage application work | pass: `ecommerce_pricelist_rules.integration.test.ts` — 4 tests, 34 assertions |
| ECOM-FUNC-022 | Product Variants | Durable variant records, deterministic fixtures, variant-specific pricelist/cart resolution, permissioned CRUD, combination/reference/price validation, stale writes, migration rerun, and restart persistence work | pass: `ecommerce_product_variants.integration.test.ts` — 4 tests, 27 assertions |
| ECOM-FUNC-023 | Product Tag Variant Assignments | Durable variant tag relations, deterministic assignments, permissioned assign/remove, active/company/duplicate validation, stale writes, migration rerun, and restart persistence work | pass: `ecommerce_product_tag_variants.integration.test.ts` — 4 tests, 20 assertions |
| ECOM-FUNC-024 | Payment Transactions | Durable checkout transactions expose unique references, amount/provider/payment state, company scope, guarded transitions, migration replay, and restart persistence | pass: `ecommerce_payment_transactions.integration.test.ts`; external provider execution remains open |
| ECOM-FUNC-025 | Payment Providers | Durable company-scoped provider fixtures expose state/publication/features/availability, permissioned CRUD and disable/restore, validation, migration replay, and restart persistence | pass: `ecommerce_payment_providers.integration.test.ts`; credentials and external gateway execution remain open |
| ECOM-FUNC-026 | Payment Tokens | Durable masked token records expose provider/method/customer/company scope, provider-created idempotent registration, ownership filtering, archive lifecycle, migration replay, and restart persistence | pass: `ecommerce_payment_tokens.integration.test.ts`; raw token creation, checkout selection, and external gateway execution remain open |
| ECOM-FUNC-027 | Wishlist | Durable customer/anonymous wishlist owners and items expose published-product filtering, unique product/variant adds, permissioned removal, cookie routes, migration replay, and restart persistence | pass: `ecommerce_wishlist.integration.test.ts`; login session merge and browser actor coverage remain open |
| ECOM-FUNC-028 | Wishlist session merge | Login-bound merge transfers unique published session items to the customer owner, removes duplicates and consumed session rows, validates company/customer/session version, replays idempotently, and survives restart | pass: `ecommerce_wishlist_merge.integration.test.ts`; shared auth event binding and browser actor coverage remain open |
| ECOM-FUNC-029 | Checkout payment token selection | Authenticated checkout lists only active verified customer/company/provider-compatible tokens, validates the selected token against the cart payment method, persists transaction token linkage and token operation, rejects guest/foreign tokens, and survives restart | pass: `ecommerce_checkout_payment_token.integration.test.ts`; live token charge and browser actor coverage remain open |
| ECOM-FUNC-030 | Product alternatives | Product Detail lists active published same-company alternatives, durable assignment CRUD enforces self/publication/company/duplicate/stale boundaries, migration replay is safe, and restart preserves recommendation order | pass: `ecommerce_product_alternatives.integration.test.ts`; rendered actor coverage remains open |
| ECOM-FUNC-031 | Product accessories | Product Detail assignments and Cart recommendations persist ordered active accessory products, filter unpublished/cross-company/already-carted targets, add idempotently, replay migrations, and survive restart | pass: `ecommerce_product_accessories.integration.test.ts`; rendered actor coverage remains open |
| ECOM-FUNC-032 | Checkout customer addresses | Durable customer/company-scoped billing and delivery addresses list for the owned checkout cart, support guarded CRUD/archive, feed checkout selection, and survive migration replay/restart | pass: `ecommerce_checkout_customer_address.integration.test.ts`; rendered actor coverage remains open |
| ECOM-FUNC-033 | Product optional recommendations | Durable ordered product optionals expose published same-company Product Detail recommendations, guarded assignment/removal, idempotent cart addition, migration replay, and restart persistence | pass: `ecommerce_product_optionals.integration.test.ts`; rendered actor coverage remains open |
| ECOM-FUNC-034 | Product variant extra media | Durable variant-scoped image media exposes active same-company Product Variant reads, guarded upload/removal, deterministic fixture replay, and restart persistence | pass: `ecommerce_product_variant_images.integration.test.ts`; rendered actor coverage remains open |
| ECOM-FUNC-035 | Product variant base-unit pricing | Durable variant base-unit count/name exposes a derived same-company unit price, zero-count hiding, guarded configuration, migration replay, and restart persistence | pass: `ecommerce_variant_base_units.integration.test.ts`; rendered actor coverage remains open |
| ECOM-FUNC-047 | Product Feed configuration/generation | Product Feed CRUD, tokenized public operation, XML generation, migration replay, restart | Durable company-scoped GMC feed configurations expose deterministic target/language/category filters, generated XML cache, token check, and cache expiry | pass: `ecommerce_product_feeds.integration.test.ts` — 3 tests, 40 assertions |
| ECOM-FUNC-046 | Product Website Sequence reordering | Products CRUD workflow, ordered projections, migration replay, restart | Durable `website_sequence` ordering supports top/bottom/up/down actions; same-state selection, company scope, optimistic concurrency, paired YAML, and restart boundaries are covered | pass: `ecommerce_product_website_sequence.integration.test.ts` — 3 tests, 30 assertions |
| ECOM-FUNC-045 | Product Website Category assignments | Product Detail assignment CRUD, ordered projection, migration replay, restart | Durable many-to-many product/category rows expose deterministic assignments; active/company, duplicate, sequence, optimistic concurrency, paired YAML, and restart boundaries are covered | pass: `ecommerce_product_category_assignments.integration.test.ts` — 3 tests, 31 assertions |
| ECOM-FUNC-044 | Product display dimensions | Product/Shop/Detail projections, CRUD, migration replay, restart | Durable `website_size_x/y` values expose deterministic catalog dimensions; 1–12 validation, company scope, optimistic concurrency, paired YAML, and restart persistence are covered | pass: `ecommerce_product_display_dimensions.integration.test.ts` — 3 tests, 31 assertions |

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
| ECOM-WF-023 | Product Ribbon configuration | Authorized catalog editor creates, edits, and deletes a ribbon; duplicate automatic assignment and stale writes are rejected without losing persisted data | pass: `ecommerce_product_ribbons.integration.test.ts`; authenticated Core3 desktop create interaction also persisted `Browser QA Ribbon` |
| ECOM-WF-024 | Product Tag configuration | Authorized catalog editor creates a tag, assigns products, edits assignments, and deletes the tag without orphaned relation rows | pass: `ecommerce_product_tags.integration.test.ts`; authenticated Core3 desktop create interaction assigned Core3 Ceramic Mug to `Browser Catalog Tag Verified` |
| ECOM-WF-025 | Product Attribute configuration | Authorized catalog editor creates an attribute with values, replaces its values, and deletes it without orphaned value rows; Odoo variant/display constraints are enforced | pass: `ecommerce_product_attributes.integration.test.ts`; authenticated Core3 desktop create interaction persisted Metal and Wood values |
| ECOM-WF-026 | Combo Choice configuration | Authorized catalog editor creates a combo, replaces its product options, and deletes it without orphaned option rows; Odoo non-empty, unique, non-combo, and extra-price constraints are enforced | pass: `ecommerce_combo_choices.integration.test.ts`; authenticated Core3 desktop create interaction persisted two product options |
| ECOM-WF-027 | Payment Method configuration | Authorized Ecommerce editor creates, edits, archives/restores, and deletes a payment method; active primary rows drive authenticated and guest checkout options | pass: `ecommerce_payment_methods.integration.test.ts`; authenticated Core3 desktop create interaction persisted `Browser Wallet` |
| ECOM-WF-028 | Delivery Method configuration | Authorized Ecommerce editor creates, edits, archives/restores, and deletes a carrier; active global/current-company rows drive authenticated and guest checkout delivery options and Cash on Delivery compatibility | pass: `ecommerce_delivery_methods.integration.test.ts`; authenticated Core3 desktop create interaction persisted `Browser Same Day` |
| ECOM-WF-029 | Pricelist Rule configuration | Authorized Ecommerce editor creates, edits, and deletes a rule; target/date/value and stale-write guards preserve the durable pricelist and cart application resolves the selected rule | pass: `ecommerce_pricelist_rules.integration.test.ts`; authenticated Core3 form and company boundary captured |
| ECOM-WF-030 | Product Variant configuration and resolution | Authorized catalog editor creates, edits, and deletes a variant; duplicate combination/reference and stale writes are rejected; restart preserves the variant and cart pricing resolves its variant rule before the template price | pass: `ecommerce_product_variants.integration.test.ts`; authenticated Core3 product detail/variant form captured |
| ECOM-WF-031 | Product Tag variant assignment | Authorized catalog editor assigns and removes a product variant from a tag; duplicate, missing, cross-company, and stale operations preserve the tag and increment its row version durably | pass: `ecommerce_product_tag_variants.integration.test.ts`; authenticated Core3 assignment form captured |
| ECOM-WF-032 | Product Tag image | Authorized catalog editor uploads/replaces an image for a product tag; invalid media, stale uploads, and missing tags leave the current image unchanged; bytes survive restart | pass: `ecommerce_product_tag_image.integration.test.ts`; authenticated Core3 detail evidence captured |
| ECOM-WF-033 | Product export | Authorized Ecommerce reader exports current company-scoped product rows with stable escaped CSV columns; replay and restart preserve the source snapshot and edits are reflected by row version | pass: `ecommerce_product_export.integration.test.ts`; Core3 browser blocked by shared Inventory discovery |
| ECOM-WF-034 | Variant configurator cart resolution | Authorized product-detail variant add validates the selected active/published/current-company combination, persists the variant-priced line, increments the same line idempotently, and survives restart for authenticated and anonymous carts | pass: `ecommerce_variant_configurator.integration.test.ts`; Core3 browser blocked by shared Inventory discovery and paired Odoo `/shop` 404 |
| ECOM-WF-035 | Payment transaction lifecycle | Checkout creates one pending transaction per order; authorized/confirmed/canceled/error transitions require valid state, provider reference where applicable, company scope, and current row version; replay/restart preserve one durable transaction | pass: `ecommerce_payment_transactions.integration.test.ts`; live provider callback/capture/refund remains open |
| ECOM-WF-036 | Payment provider configuration | Authorized Ecommerce editor creates/edits a company provider, validates technical code/state/features/amount, disables/restores it with optimistic concurrency, and preserves the provider across restart | pass: `ecommerce_payment_providers.integration.test.ts`; live credentials/module installation remains open |
| ECOM-WF-037 | Payment token lifecycle | Provider-created masked token registration is idempotent and validates provider/method/customer/company; authorized retirement is optimistic and durable; unarchive is intentionally not exposed | pass: `ecommerce_payment_tokens.integration.test.ts`; external gateway/token vault remains open |
| ECOM-WF-038 | Wishlist lifecycle | A public or customer wishlist adds one published product/variant idempotently, lists only available rows, removes with ownership/row-version guards, and survives restart | pass: `ecommerce_wishlist.integration.test.ts`; login merge remains open |
| ECOM-WF-039 | Wishlist session merge | Login consumes the anonymous wishlist session, drops products already owned by the customer, assigns remaining items to the durable customer wishlist, and safely replays after a retry | pass: `ecommerce_wishlist_merge.integration.test.ts`; auth listener and rendered login flow remain open |
| ECOM-WF-040 | Checkout saved-token payment | Customer selects a saved token for an open cart; checkout creates one pending token-linked transaction with `offline_token`, rejects stale/foreign/disabled selections without order mutation, and preserves the linkage after restart | pass: `ecommerce_checkout_payment_token.integration.test.ts`; external provider charge remains open |
| ECOM-WF-041 | Product recommendation management | Catalog editor assigns/removes ordered alternative products on Product Detail; customer-facing source excludes inactive/unpublished/cross-company targets and preserves assignments after restart | pass: `ecommerce_product_alternatives.integration.test.ts`; authenticated desktop/mobile rendering remains open |
| ECOM-WF-042 | Cart accessory cross-sell | Cart products resolve active published same-company accessory assignments before payment; the customer can add an accessory repeatedly without duplicate lines, and assignment/removal is durable and stale-guarded | pass: `ecommerce_product_accessories.integration.test.ts`; authenticated desktop/mobile rendering and paired Odoo remain open |
| ECOM-WF-043 | Checkout saved customer address | Authenticated checkout lists the customer's active billing/delivery addresses, creates/updates/archives one with optimistic concurrency, and persists a selected address on the confirmed order; guests retain free-text checkout | pass: `ecommerce_checkout_customer_address.integration.test.ts`; authenticated desktop/mobile rendering and paired Odoo remain open |
| ECOM-WF-044 | Product optional configurator/cart | Catalog editor assigns/removes an ordered optional product; Product Detail exposes only active published same-company targets; customer adds an assigned optional idempotently to the open cart and restart preserves the assignment | pass: `ecommerce_product_optionals.integration.test.ts`; authenticated desktop/mobile rendering and paired Odoo remain open |
| ECOM-WF-045 | Product variant extra media | Authorized catalog editor opens a variant, uploads/removes image media with file and company validation, preserves optimistic concurrency, and reload/restart retains the selected variant media | pass: `ecommerce_product_variant_images.integration.test.ts`; authenticated desktop/mobile rendering and paired Odoo remain open |
| ECOM-WF-046 | Product variant base-unit pricing | Authorized catalog editor configures a variant’s base-unit count/name; Product Detail and Variant detail calculate Price Per Unit, hide it at zero count, reject stale/company/invalid writes, and preserve values after restart | pass: `ecommerce_variant_base_units.integration.test.ts`; authenticated desktop/mobile rendering and paired Odoo remain open |

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
| ECOM-PERM-019 | Product Ribbon read/write boundary | `ecommerce.read` protects the page/query and `ecommerce.write` protects create/edit/delete; unauthenticated, forbidden, invalid, duplicate-assignment, and stale requests return declared errors | pass: `ecommerce_product_ribbons.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-020 | Product Tag read/write boundary | `ecommerce.read` protects the page/query and `ecommerce.write` protects create/edit/delete; duplicate, invalid, and stale requests preserve the current tag and assignments | pass: `ecommerce_product_tags.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-021 | Product Attribute read/write boundary | `ecommerce.read` protects the page/query and `ecommerce.write` protects create/edit/delete; duplicate, invalid, incompatible-mode, and stale requests preserve the current attribute and values | pass: `ecommerce_product_attributes.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-022 | Combo Choice read/write/company boundary | `ecommerce.read` protects the page/query and `ecommerce.write` protects create/edit/delete; cross-company, invalid, duplicate-option, non-combo, and stale requests preserve the current combo and options | pass: `ecommerce_combo_choices.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-023 | Payment Method read/write boundary | `ecommerce.read` protects the page/query and checkout option source; `ecommerce.write` protects create/edit/archive/restore/delete; invalid, duplicate-code, and stale requests preserve the catalog | pass: `ecommerce_payment_methods.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-024 | Delivery Method read/write/company boundary | `ecommerce.read` protects the page/query and checkout option source; `ecommerce.write` protects create/edit/archive/restore/delete; invalid, duplicate-scope, cross-company, Cash on Delivery, and stale requests preserve the catalog | pass: `ecommerce_delivery_methods.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-025 | Pricelist Rule read/write/company boundary | `ecommerce.read` protects the detail/rules/options sources and `ecommerce.write` protects create/edit/delete; invalid target/date/value, duplicate, cross-company, and stale requests preserve the pricelist | pass: `ecommerce_pricelist_rules.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-026 | Product Variant read/write/company boundary | `ecommerce.read` protects variant/detail sources and `ecommerce.write` protects create/edit/delete; cross-company, duplicate combination/reference, invalid price, and stale requests preserve the product and variants | pass: `ecommerce_product_variants.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-027 | Product Tag Variant read/write/company boundary | `ecommerce.read` protects variant option/tag projections and `ecommerce.write` protects assign/remove; inactive, non-combination, cross-company, duplicate, missing, and stale requests preserve the tag | pass: `ecommerce_product_tag_variants.integration.test.ts` contract and mutation coverage |
| ECOM-PERM-028 | Product Tag image read/write boundary | `ecommerce.read` protects tag detail/image reads and download; `ecommerce.write` protects upload/replacement; non-image, oversized, missing-tag, and stale requests preserve the current image | pass: `ecommerce_product_tag_image.integration.test.ts` |
| ECOM-PERM-029 | Product export read/company boundary | `ecommerce.read` protects the Products page/query/export; company context excludes other-company rows and export performs no mutation or cross-company widening | pass: `ecommerce_product_export.integration.test.ts` |
| ECOM-PERM-030 | Variant configurator cart boundary | `ecommerce.write` protects authenticated variant mutation; inactive, unpublished, cross-company, missing, and non-matching variants are rejected without changing the cart; anonymous YAML mutation requires a valid public cart and published current-company variant | pass: `ecommerce_variant_configurator.integration.test.ts` |
| ECOM-PERM-031 | Payment transaction company/state boundary | `ecommerce.read` protects transaction list/state sources and `ecommerce.write` protects transitions; wrong-company, stale, invalid-state, and missing-provider-reference writes are rejected without changing the transaction | pass: `ecommerce_payment_transactions.integration.test.ts` |
| ECOM-PERM-032 | Payment provider company/write boundary | `ecommerce.read` protects provider sources and `ecommerce.write` protects create/edit/disable/restore; duplicate code, wrong-company, invalid feature/amount, and stale writes preserve the provider catalog | pass: `ecommerce_payment_providers.integration.test.ts` |
| ECOM-PERM-033 | Payment token customer/company/write boundary | `ecommerce.read` filters token rows by customer/company scope and `ecommerce.write` protects provider registration/retirement; masked-value, provider/method/customer, wrong-company, and stale requests preserve the token | pass: `ecommerce_payment_tokens.integration.test.ts`; technical-group HTTP actor coverage remains open |
| ECOM-PERM-034 | Wishlist owner/company/write boundary | `ecommerce.read` protects wishlist reads and public contract; `ecommerce.write` protects customer add/remove; wrong-company, other-customer, unpublished, invalid-variant, duplicate, and stale requests preserve ownership and rows | pass: `ecommerce_wishlist.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-035 | Wishlist merge ownership/company boundary | `ecommerce.write` protects login merge; wrong-company, unknown-customer, self-merge, foreign session, and stale session requests are rejected without changing target or session rows; consumed-session retry is idempotent | pass: `ecommerce_wishlist_merge.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-036 | Checkout token ownership/company boundary | `ecommerce.read` exposes only active verified tokens for the open customer cart and `ecommerce.write` protects token selection; foreign customer/company, disabled provider, incompatible method, and guest token submissions are rejected without order/transaction/cart changes | pass: `ecommerce_checkout_payment_token.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-037 | Product alternatives read/write/company boundary | `ecommerce.read` protects published recommendation reads and `ecommerce.write` protects assignment/removal; self-target, unpublished, inactive, cross-company, duplicate, and stale requests leave the source and relation rows unchanged | pass: `ecommerce_product_alternatives.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-038 | Product accessories/cart boundary | `ecommerce.read` exposes only active published same-company non-carted accessories and `ecommerce.write` protects assignment/removal/cart add; unpublished, cross-company, duplicate, foreign-cart, and stale requests preserve catalog/cart rows | pass: `ecommerce_product_accessories.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-039 | Checkout address ownership/company boundary | `ecommerce.read` exposes only active addresses belonging to the open cart customer/company and `ecommerce.write` protects create/update/archive/selection; foreign customer/company, invalid type/fields, duplicate labels, and stale writes preserve address/cart/order rows | pass: `ecommerce_checkout_customer_address.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-054 | Product Feed permission/company/token boundary | `ecommerce.read` protects feed configuration reads and `ecommerce.write` protects CRUD/generation; wrong-company, duplicate, invalid selector, stale, and wrong-token requests preserve feed state | pass: `ecommerce_product_feeds.integration.test.ts` |
| ECOM-PERM-053 | Product Website Sequence permission/company boundary | `ecommerce.read` protects Products data and `ecommerce.write` protects reorder actions; wrong-company, inactive, edge, and stale writes preserve product ordering | pass: `ecommerce_product_website_sequence.integration.test.ts` |
| ECOM-PERM-052 | Product Website Category assignment boundary | `ecommerce.read` protects Product Detail category sources and `ecommerce.write` protects assign/edit/remove; wrong-company, inactive/cross-company, duplicate, invalid-sequence, and stale writes preserve assignments | pass: `ecommerce_product_category_assignments.integration.test.ts` |
| ECOM-PERM-051 | Product display dimensions permission/company boundary | `ecommerce.read` protects Products/Shop/Detail projections and `ecommerce.write` protects create/edit; wrong-company, invalid-range, and stale writes preserve product dimensions | pass: `ecommerce_product_display_dimensions.integration.test.ts` |
| ECOM-PERM-040 | Product optional read/write/cart boundary | `ecommerce.read` exposes only active published same-company optional targets and `ecommerce.write` protects assignment/removal/cart add; self-target, unpublished, cross-company, duplicate, foreign-cart, and stale requests preserve catalog/cart rows | pass: `ecommerce_product_optionals.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-041 | Product variant media read/write/company boundary | `ecommerce.read` protects variant detail/media reads and downloads while `ecommerce.write` protects upload/removal; wrong company, inactive product, non-image/oversized, duplicate, missing, and stale requests preserve the variant media rows | pass: `ecommerce_product_variant_images.integration.test.ts`; authenticated HTTP actor coverage remains open |
| ECOM-PERM-042 | Product variant base-unit read/write/company boundary | `ecommerce.read` protects variant price/unit projections and `ecommerce.write` protects configuration; wrong company, negative count, invalid unit name, zero-count, and stale requests preserve variant pricing metadata | pass: `ecommerce_variant_base_units.integration.test.ts`; authenticated HTTP actor coverage remains open |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| ECOM-UI-001 | Shop/product/product-detail/pricelist/categories/orders/unpaid/abandoned/customers | 1440x900, 390x844 | Catalog cards, product detail, category/order/customer lists, unpaid/abandoned filters, prices, controls and responsive layout match Odoo | planned paired capture |
| ECOM-UI-002 | Cart/checkout/payment | both | Cart summary, checkout steps, validation and payment states match Odoo | authenticated route smoke passed; submit interaction and paired Odoo capture planned |
| ECOM-UI-003 | Empty/unpublished/error | both | Public visibility, empty and error states do not leak content or overflow | planned |
| ECOM-UI-004 | Current route regression | all manifest-owned Ecommerce routes | Public/authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |
| ECOM-UI-005 | Product Ribbons list/form | 1440x900, 390x844 | Authenticated Core3 list, desktop create form/post-create state, and mobile list render with deterministic fixtures; paired Odoo comparison is required but blocked by authenticated `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-ribbons-001/` |
| ECOM-UI-006 | Product Tags list/form | 1440x900, 390x844 | Authenticated Core3 list, desktop create form/post-create assignment, and mobile list render with deterministic fixtures; paired Odoo comparison is required but blocked by authenticated `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-tags-001/` |
| ECOM-UI-007 | Product Attributes list/form | 1440x900, 390x844 | Authenticated Core3 list, desktop create form/post-create values, and mobile list render with deterministic fixtures; paired Odoo comparison is required but blocked by authenticated `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-attributes-001/` |
| ECOM-UI-008 | Combo Choices list/form | 1440x900, 390x844 | Authenticated Core3 list, desktop create form/post-create options, and mobile list render with deterministic fixtures; paired Odoo comparison is required but blocked by authenticated `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-combo-choices-001/` |
| ECOM-UI-009 | Payment Methods list/form/checkout source | 1440x900, 390x844 | Authenticated Core3 list, desktop create form/post-create active method, mobile list, and checkout option source render with deterministic fixtures; paired Odoo comparison is required but blocked by authenticated `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-checkout-payment-methods-001/` |
| ECOM-UI-010 | Delivery Methods list/form/checkout source | 1440x900, 390x844 | Authenticated Core3 list, desktop create form/post-create carrier, mobile list, and checkout delivery/Cash on Delivery source render with deterministic fixtures; paired Odoo comparison is required but blocked by authenticated `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-checkout-delivery-methods-001/` |
| ECOM-UI-011 | Pricelist Rules detail/form/cart source | 1440x900, 390x844 | Authenticated Core3 detail renders seeded rules and Add Price Rule form at desktop/mobile; company boundary is visible; paired Odoo comparison is blocked by exact `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-pricelist-rules-001/` |
| ECOM-UI-012 | Product Variant detail/form/cart resolution | 1440x900, 390x844 | Authenticated Core3 product detail renders seeded variants and desktop New Variant form at both responsive states; variant-specific cart/pricelist resolution is test-backed; paired Odoo comparison is blocked by exact `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-variants-001/` |
| ECOM-UI-013 | Product Tag variant assignment list/form | 1440x900, 390x844 | Authenticated Core3 tag list renders assigned variant counts/names, desktop Assign Variant form exposes deterministic variants, and mobile list remains readable; paired Odoo comparison is blocked by exact `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-variant-assignment-001/` |
| ECOM-UI-014 | Product Tag image detail/form | 1440x900, 390x844 | Authenticated Core3 Product Tags list opens an image-capable detail form and remains readable at mobile; paired Odoo comparison is blocked by exact `/shop` 404 on both reference instances | Core3 pass; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-tag-image-001/` |
| ECOM-UI-015 | Product export | 1440x900, 390x844 | Authenticated Core3 Products list exposes Export and downloads deterministic CSV; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture is additionally blocked by shared Inventory discovery | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-product-export-001/` |
| ECOM-UI-016 | Variant configurator cart resolution | 1440x900, 390x844 | Authenticated Core3 Product Detail variant rows expose Add to Cart and preserve the selected variant in Cart; paired Odoo comparison requires combination resolution but is blocked by exact `/shop` 404; Core3 capture is blocked by shared Inventory discovery | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-catalog-variant-configurator-001/` |
| ECOM-UI-017 | Payment Transactions list/state lifecycle | 1440x900, 390x844 | Authenticated Core3 Payment Transactions list renders deterministic references/statuses and status transition form at responsive widths; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by backend 502 | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-checkout-payment-transactions-001/` |
| ECOM-UI-018 | Payment Providers list/configuration | 1440x900, 390x844 | Authenticated Core3 Payment Providers list renders deterministic provider state/features and create/edit/disable controls at responsive widths; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by the backend/runtime boundary | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-checkout-payment-providers-001/` |
| ECOM-UI-019 | Payment Tokens list/retirement | 1440x900, 390x844 | Technical/authenticated Core3 Payment Tokens list renders masked details, provider/customer/company fields, archived filter, and retirement boundary at responsive widths; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-20/ecom-checkout-payment-tokens-001/` |
| ECOM-UI-020 | Wishlist list/add/remove | 1440x900, 390x844 | Authenticated/customer and public Core3 wishlist list, saved product state, duplicate add, and removal render responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-wishlist-001/` |
| ECOM-UI-021 | Wishlist login merge | 1440x900, 390x844 | Authenticated Core3 login/session consumption should show duplicate suppression and remaining saved items in the customer wishlist; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports; auth event binding remains open | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-wishlist-merge-001/` |
| ECOM-UI-022 | Checkout saved payment token | 1440x900, 390x844 | Authenticated Core3 checkout lists the customer token, links the selected token to the payment transaction, and keeps guest checkout token-free; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-checkout-payment-token-selection-001/` |
| ECOM-UI-023 | Product Detail alternative products | 1440x900, 390x844 | Authenticated Core3 Product Detail lists ordered published alternatives and exposes the assignment form at desktop/mobile; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-alternatives-001/` |
| ECOM-UI-024 | Cart accessory recommendations | 1440x900, 390x844 | Authenticated Core3 Cart shows active published same-company accessories not already in the cart and Add to Cart preserves the line at desktop/mobile; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-accessories-001/` |
| ECOM-UI-025 | Checkout saved customer addresses | 1440x900, 390x844 | Authenticated Core3 checkout lists saved billing/delivery addresses, supports desktop CRUD and mobile selection, and persists the selected address on the order; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-checkout-customer-address-001/` |
| ECOM-UI-026 | Product Detail optional recommendations | 1440x900, 390x844 | Authenticated Core3 Product Detail renders ordered optional products, desktop assignment/add-to-cart controls, and readable mobile state; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-optionals-001/` |
| ECOM-UI-027 | Product Variant extra media | 1440x900, 390x844 | Authenticated Core3 Product Variant renders the extra-media viewer, upload state, and removal control at desktop/mobile; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-variant-extra-media-001/` |
| ECOM-UI-028 | Product Variant base-unit pricing | 1440x900, 390x844 | Authenticated Core3 Product Detail and Variant detail render Base Unit Count, Base Unit, Price Per Unit, configuration form, and zero-count hidden state at desktop/mobile; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-variant-base-unit-pricing-001/` |
| ECOM-FUNC-036 | Product compare-at pricing | Product/variant CRUD, shop/detail projections, restart | `compare_list_price` persists for products and variants; `compare_at_price` is only returned when above sales price; zero/negative, company, stale, and migration-replay boundaries are covered | pass: 3 focused tests, 33 assertions; adjacent regression included |
| ECOM-WF-047 | Product compare-at pricing workflow | Products and Product Variant detail | Permissioned product edit and dedicated variant compare-price action persist the value and increment row versions without stale overwrite | pass: focused CRUD and stale replay |
| ECOM-PERM-043 | Product compare-at pricing permission/company boundary | Products and Product Variant detail | `ecommerce.read` gates reads, `ecommerce.write` gates writes, and wrong-company writes are rejected | pass: permission declarations and company rejection |
| ECOM-UI-029 | Product compare-at pricing | 1440x900, 390x844 | Authenticated Core3 Products, Shop, Product Detail, and Variant detail render Compare to Price only when greater than the actual price; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-compare-price-001/` |
| ECOM-FUNC-037 | Product website description | Product CRUD, searchable Products/Shop, detail projection, restart | `website_description` persists and is searchable; rich-text content, empty state, script-tag, length, company, stale, and migration-replay boundaries are covered | pass: 3 focused tests, 24 assertions |
| ECOM-WF-048 | Product website description workflow | Product Detail edit | Permissioned product edit persists website description and increments row version; stale replay cannot overwrite current content | pass: focused CRUD and stale replay |
| ECOM-PERM-044 | Product website description permission/company boundary | Products and Product Detail | `ecommerce.read` gates sources, `ecommerce.write` gates edit, and wrong-company edits are rejected | pass: permission declaration and company rejection |
| ECOM-UI-030 | Product website description | 1440x900, 390x844 | Authenticated Core3 Products, Shop, and Product Detail expose the description field/search projection responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime ports | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-website-description-001/` |
| ECOM-FUNC-038 | Product documents | Product Detail/document CRUD, upload/download, migration replay, restart | Durable product-template document metadata and bytes; deterministic fixture; active/published/sequence lifecycle; validation, company, stale, and delete boundaries | pass: `ecommerce_product_documents.integration.test.ts` — 3 tests, 33 assertions |
| ECOM-WF-049 | Product document workflow | Product Detail → document detail | Permissioned create, binary replacement, authenticated download, publish toggle, edit, delete, and restart replay preserve one document row and its storage bytes | pass: focused CRUD/upload/download/restart coverage |
| ECOM-PERM-045 | Product document permission/company boundary | Product Detail and Document Detail | `ecommerce.read` protects sources/download; `ecommerce.write` protects create/upload/edit/delete; wrong-company, invalid, and stale writes preserve the document | pass: focused permission declarations and guard matrix |
| ECOM-UI-031 | Product documents | 1440x900, 390x844 | Authenticated Core3 Product Detail document list and Document Detail attachment panel should render create/upload/publish/delete states; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-documents-001/` |
| ECOM-FUNC-039 | Category cover image | Category CRUD, upload/download/remove, migration replay, restart | Durable category cover metadata and exact bytes; deterministic fixture; image MIME/size, active, company, permission, and stale boundaries are covered | pass: `ecommerce_category_cover_image.integration.test.ts` — 3 tests, 38 combined assertions |
| ECOM-WF-050 | Category cover image workflow | Categories → Category Detail | Permissioned upload/replace, authenticated download, removal, and restart replay preserve one category cover row and its storage bytes | pass: focused CRUD/upload/download/remove/restart coverage |
| ECOM-PERM-046 | Category cover image permission/company boundary | Category list/detail and attachment route | `ecommerce.read` protects reads/downloads; `ecommerce.write` protects upload/remove; wrong-company, invalid, inactive, missing, and stale requests preserve category metadata | pass: focused permission declarations and guard matrix |
| ECOM-UI-032 | Category cover image | 1440x900, 390x844 | Authenticated Core3 category list/detail should render cover metadata and upload/remove states responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-category-cover-image-001/` |
| ECOM-FUNC-040 | Product publication | Product CRUD, publish/unpublish, migration replay, restart | Durable `is_published`/`publish_date` state; deterministic published fixtures; Shop visibility, active, company, permission, and stale boundaries are covered | pass: `ecommerce_product_publication.integration.test.ts` — 3 tests, 28 assertions |
| ECOM-WF-051 | Product publication workflow | Products/Product Detail → Shop | Permissioned publish and unpublish actions persist timestamps, increment row versions, refresh Shop, and preserve state after restart | pass: focused publish/unpublish and restart coverage |
| ECOM-PERM-047 | Product publication permission/company boundary | Products and Product Detail | `ecommerce.write` protects publication changes; wrong-company, inactive, and stale requests preserve product state | pass: focused permission declarations and guard matrix |
| ECOM-UI-033 | Product publication | 1440x900, 390x844 | Authenticated Core3 Products and Product Detail should render publish/unpublish controls, timestamp, and public Shop visibility responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-publication-001/` |
| ECOM-FUNC-041 | Product SEO metadata | Product Detail CRUD, optimization projection, migration replay, restart | Durable meta title/description/keywords/OpenGraph values; deterministic fixture; complete/cleared optimization, validation, company, permission, and stale boundaries are covered | pass: `ecommerce_product_seo_metadata.integration.test.ts` — 3 tests, 22 assertions |
| ECOM-WF-052 | Product SEO metadata workflow | Product Detail → website head projection | Permissioned SEO form persists all four metadata fields, computes optimization state, and survives restart without overwriting stale edits | pass: focused CRUD, projection, and restart coverage |
| ECOM-PERM-048 | Product SEO metadata permission/company boundary | Product Detail SEO form | `ecommerce.write` protects SEO updates; wrong-company, inactive, invalid, and stale requests preserve product metadata | pass: focused permission declarations and guard matrix |
| ECOM-UI-034 | Product SEO metadata | 1440x900, 390x844 | Authenticated Core3 Product Detail should render SEO Metadata fields and optimization state responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-seo-metadata-001/` |
| ECOM-UI-040 | Product Feed configuration/generation | 1440x900, 390x844 | Authenticated Core3 Product Feeds should render target/language/category filters, generated URL/cache state, and CRUD/generate actions responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-feed-001/` |
| ECOM-UI-039 | Product Website Sequence reordering | 1440x900, 390x844 | Authenticated Core3 Products should render ordered products and Move Top/Up/Down/Bottom actions responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-website-sequence-reorder-001/` |
| ECOM-UI-038 | Product Website Category assignments | 1440x900, 390x844 | Authenticated Core3 Product Detail should render assigned Website Categories, ordering, Add Category, Edit, and Remove states responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-category-assignment-001/` |
| ECOM-UI-037 | Product display dimensions | 1440x900, 390x844 | Authenticated Core3 Products, Shop, and Product Detail should render Display Width/Height projections and edit controls responsively; paired Odoo comparison is blocked by exact `/shop` 404 and Core3 capture by unavailable runtime/browser | Core3 browser blocked; Odoo pair blocked; artifacts at `../evidence/ecommerce/2026-09-21/ecom-catalog-product-display-dimensions-001/` |

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
