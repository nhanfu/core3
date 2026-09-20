# Ecommerce Product Tag Variant Assignment evidence

Feature: `ECOM-CATALOG-PRODUCT-TAG-VARIANT-ASSIGNMENT-001`
Date: 2026-09-20
Core3 route: `/ecommerce/product-tags`

Core3 was exercised authenticated as `admin@tms.local` at 1440x900 and
390x844. The desktop list renders deterministic template and variant
assignments (`Core3 Ceramic Mug (Blue)` and `Ergonomic Office Chair (Black)`),
and the desktop Assign Variant form exposes both durable variant choices. The
mobile list preserves the variant count/name columns. No post-navigation page
or request errors were recorded.

The implementation compares Odoo's `product.tag.product_product_ids`
many-to-many field and Product Tags list/action with the separated
`pages/product-tags.yaml` and `api/product-tags.yaml` contracts. Migrations
050/051 add the durable variant relation and deterministic assignments. The
API's assign/remove actions enforce `ecommerce.write`, active combination
variants, company scope, duplicate/missing boundaries, and tag row-version
concurrency.

Odoo comparison is blocked: authenticated requests to `/shop` on ports 8069
and 8073 returned exact HTTP 404 at both viewports. The paired blocker
captures are `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`,
`odoo-8073-desktop-shop.png`, and `odoo-8073-mobile-shop.png`.

This is a bounded implementation, not Ecommerce module sign-off. Product Tag
image parity, full website combination rendering, broader actor/company
browser coverage, and the remaining module gates are open.
