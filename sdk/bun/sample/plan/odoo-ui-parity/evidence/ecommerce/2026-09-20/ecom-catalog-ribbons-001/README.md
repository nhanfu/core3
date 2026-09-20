# ECOM-CATALOG-RIBBONS-001 evidence

Captured: 2026-09-20

## Source and routes

- Odoo: `product_catalog_product_ribbons` → `website_sale.product_ribbon_action`,
  model `product.ribbon`.
- Core3: `/ecommerce/product-ribbons`, page id
  `ecommerce-product-ribbons`; API and page contracts are separate YAML files.

## Core3 authenticated capture

Runtime: `http://127.0.0.1:4312`, authenticated as `admin@tms.local`.

- `core3-desktop-list.png` — 1440x900 deterministic list.
- `core3-desktop-form.png` — 1440x900 New Product Ribbon form.
- `core3-desktop-after-create.png` — 1440x900 list after creating
  `Browser QA Ribbon` through the UI.
- `core3-mobile-list.png` — 390x844 authenticated responsive list.
- `browser-check.json` — URLs, captured text, authentication state, and browser
  error collection. Core3 page/request errors were empty.

## Authenticated Odoo reference capture

Authentication succeeded with `codex@core3.local` / database
`core3_codex_demo` on both supplied instances. The requested Website/eCommerce
surface is unavailable: authenticated `/shop` returned the Odoo 404 page on
both ports. These captures document the blocker rather than claiming paired
parity:

- `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`
- `odoo-8073-desktop-shop.png`, `odoo-8073-mobile-shop.png`

The paired Odoo Product Ribbon comparison and module sign-off remain pending
until a reference database with `website_sale` installed is supplied.

## Verification commands

- `bun test test/ecommerce_product_ribbons.integration.test.ts --timeout 20000`
  — 4 passed, 28 assertions.
- `bun run audit` — 668 pages, 677 routes, 1196 datasources; passed.
