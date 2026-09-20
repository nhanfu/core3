# ECOM-CATALOG-PRODUCT-TAGS-001 evidence

Captured: 2026-09-20

## Source and routes

- Odoo: Website > Configuration > eCommerce > Products > Product Tags;
  `product_catalog_product_tags` opens `product.product_tag_action` for
  `product.tag`, with list/form views and product-template/product-variant
  assignments.
- Core3: `/ecommerce/product-tags`, page id `ecommerce-product-tags`; page and
  API contracts are separate YAML files.

## Core3 authenticated capture

Runtime: `http://127.0.0.1:4312`, authenticated as `admin@tms.local`.

- `core3-desktop-list.png` — 1440x900 deterministic tags and assignments.
- `core3-desktop-form.png` — 1440x900 New Product Tag form.
- `core3-desktop-after-create.png` — 1440x900 list after creating
  `Browser Catalog Tag Verified` and assigning Core3 Ceramic Mug through the UI.
- `core3-mobile-list.png` — 390x844 authenticated responsive list.
- `browser-check.json` — URLs, captured text, authentication state, and browser
  error collection. Core3 page/request errors were empty.

## Authenticated Odoo reference capture

Authentication succeeded with `codex@core3.local` / database
`core3_codex_demo` on ports 8069 and 8073 at both viewports. The supplied
reference still has no Website/eCommerce surface: authenticated `/shop`
returned the Odoo 404 page on both instances. The files below record the exact
blocker rather than claiming paired parity:

- `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`
- `odoo-8073-desktop-shop.png`, `odoo-8073-mobile-shop.png`

The paired Product Tags comparison and full Ecommerce sign-off remain pending
until a reference database with `website_sale` installed is supplied.
