# ECOM-CATALOG-PRODUCT-COMBO-CHOICES-001 evidence

Captured: 2026-09-20

## Source and routes

- Odoo: Website > Configuration > eCommerce > Products > Combo Choices;
  `menu_product_combos` → `product.product_combo_action`, model `product.combo`,
  path `combo-choices`, list/form views.
- Core3: `/ecommerce/combo-choices`, page id
  `ecommerce-combo-choices`; page and API contracts are separate YAML.

## Core3 authenticated capture

Runtime: `http://127.0.0.1:4312`, authenticated as `admin@tms.local`.

- `core3-desktop-list.png` — 1440x900 deterministic Workspace Essentials and
  Office Upgrade combos, computed minimum price, and product counts.
- `core3-desktop-form.png` — 1440x900 New Combo Choice form with product option
  lines and company scope. The authenticated company is `Core3 Demo Company`;
  the text-input renderer uses semicolons between option lines while the API
  also accepts YAML newline-delimited input.
- `core3-desktop-after-create.png` — 1440x900 list after creating
  `Browser Workspace Combo` with two durable product options through the UI.
- `core3-mobile-list.png` — 390x844 authenticated responsive list.
- `browser-check.json` — URLs, captured text, authentication state, and browser
  error collection. Core3 page/request errors were empty.

## Authenticated Odoo reference capture

Authentication succeeded with `codex@core3.local` against database
`core3_codex_demo` on ports 8069 and 8073 at both viewports. The supplied
reference has no Website/eCommerce surface: authenticated `/shop` returned the
Odoo 404 page on both instances. These captures document the exact blocker:

- `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`
- `odoo-8073-desktop-shop.png`, `odoo-8073-mobile-shop.png`

The paired Combo Choices comparison and full Ecommerce sign-off remain pending
until a reference database with `website_sale` installed is supplied.
