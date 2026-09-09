# eCommerce (Website Sale) — UI-only sub-plan

Status: `planning`

## Reference and source availability

- Odoo addon: `website_sale`; supplied Odoo 19 source: available; verify demo-data flag.
- Core3 status: no dedicated `website_sale` service directory in this checkout; compose with YAML routes/datasources and shared website/order primitives.
- Scope: storefront/catalog/cart/checkout UI; payment/shipping backends are fixture-backed.

## Menu, action, route, and view inventory

- Configuration: products, categories, attributes/variants, pricelists, taxes, shipping/payment settings, publication.
- Storefront: shop/category grid, search, sort, filters, pager, product detail, variants/quantity, add-to-cart, out-of-stock/empty.
- Cart/checkout: lines, quantities/remove, totals/taxes/discounts, customer/address, delivery, payment, review/confirmation, validation/failure.
- Orders/portal: confirmation, history/detail, guest/login state, responsive mobile filter drawer/cards/sticky totals/forms.

## YAML composition and backend mock-data plan

Storefront YAML is layout/composition only. Backend datasource YAML owns `mock_data` for products, categories, attributes, variants, images, prices/pricelists, taxes, stock, cart, checkout customer/addresses, shipping/payment methods, orders, totals, and action results. Include pagination/filter products, variants, sale/compare prices, out-of-stock/unpublished, empty search/category, cart states, discounts, checkout validation, shipping/payment options, exact tax/order totals, deterministic confirmation/error, and stable asset ids/URLs.

## Shared UI primitives

Reuse website composition, storefront grid/card, search/filter/sort/pager, gallery, variant selector, monetary/tax totals, cart editor, address form, stepper, shipping/payment selector, dialogs/toasts, and mobile primitives. Record gaps before implementation.

## Screenshots

Capture Odoo 19/Core3 at `1440x900` and `390x844`: catalog/category/search/filter, product variants, out-of-stock/empty, cart, every checkout step, confirmation/error, admin configuration, portal order. Record route/state/viewport/build.

## Acceptance

- Catalog, product, cart, checkout, confirmation, configuration, and mobile flows match.
- Every visible product/cart/checkout/order total has backend `mock_data`; page YAML has no records and storefront renders offline.
- Search/filter/sort/pager, variants, quantity, taxes/discounts, validation, empty/out-of-stock, shipping/payment, and deterministic result states pass; visual review and `git diff --check` are clean.
