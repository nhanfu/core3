# Ecommerce Product Variants evidence

Feature: `ECOM-CATALOG-PRODUCT-VARIANTS-001`
Date: 2026-09-20
Core3 route: `/ecommerce/products/detail?id=ecommerce-product-mug`

Core3 was exercised authenticated as `admin@tms.local` at 1440x900 and
390x844. The desktop detail capture renders the durable blue Mug variant;
the desktop New Variant capture renders the create form; and the mobile
detail capture confirms the responsive variant list. No post-navigation page
or request errors were recorded.

The implementation compares Odoo's `product.product` variant action/list/form,
website_sale variant fields, and combination/variant pricing source with the
separated `pages/product-detail.yaml` and `api/product-detail.yaml` contracts.
Migrations 048/049 add durable variant records, cart/pricelist references, and
deterministic fixtures. Variant CRUD is permissioned and guarded by company,
combination/reference, non-negative price, and row-version validation.

Odoo comparison is blocked: authenticated requests to `/shop` on ports 8069
and 8073 returned exact HTTP 404 at both viewports. The paired blocker
captures are `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`,
`odoo-8073-desktop-shop.png`, and `odoo-8073-mobile-shop.png`.

This is a bounded implementation, not Ecommerce module sign-off. Full Odoo
configurator, variant media, currency, external pricing, and broader actor /
company browser gates remain open.
