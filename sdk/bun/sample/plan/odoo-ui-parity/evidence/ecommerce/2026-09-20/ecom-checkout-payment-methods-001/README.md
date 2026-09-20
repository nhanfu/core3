# ECOM-CHECKOUT-PAYMENT-METHODS-001 evidence

Captured: 2026-09-20

## Source and routes

- Odoo: Website > Global Configuration > eCommerce > Payment Methods;
  `menu_ecommerce_payment_methods` → `payment.action_payment_method`, model
  `payment.method`, path `payment-methods`, list/kanban/form views.
- Core3: `/ecommerce/payment-methods`, page id
  `ecommerce-payment-methods`; page and API contracts are separate YAML.

## Core3 authenticated capture

Runtime: `http://127.0.0.1:4312`, authenticated as `admin@tms.local`.

- `core3-desktop-list.png` — 1440x900 deterministic Wire Transfer, Cash on
  Delivery, and Card methods.
- `core3-desktop-form.png` — 1440x900 New Payment Method form with technical
  code, provider, availability, and feature support fields.
- `core3-desktop-after-create.png` — 1440x900 list after creating active
  `Browser Wallet` through the UI; it becomes the first checkout option by
  sequence.
- `core3-mobile-list.png` — 390x844 authenticated responsive list after the
  same durable create.
- `browser-check.json` — URLs, authentication state, captured text, and error
  collection. Core3 page/request errors were empty.

## Authenticated Odoo reference capture

Authentication succeeded with `codex@core3.local` against database
`core3_codex_demo` on ports 8069 and 8073 at both viewports. The supplied
reference has no Website/eCommerce surface: authenticated `/shop` returned the
exact Odoo 404 page on both instances. These captures document the blocker:

- `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`
- `odoo-8073-desktop-shop.png`, `odoo-8073-mobile-shop.png`

The paired Payment Methods comparison and full Ecommerce sign-off remain
pending until a reference database with `website_sale` installed is supplied.
