# Ecommerce Pricelist Rules evidence

Feature: `ECOM-CATALOG-PRICELIST-RULES-001`
Date: 2026-09-20
Core3 route: `/ecommerce/pricelists/detail?id=ecommerce-pricelist-retail`

Core3 was exercised authenticated as `admin@tms.local` at 1440x900 and
390x844. The desktop detail capture renders the durable seeded Odoo rule for
Ergonomic Office Chair, and the rule form capture exposes Apply On, product,
fixed/discount/formula pricing, quantity, dates, margins, and base-pricelist
fields. The attempted browser create on the seeded `My Company` fixture was
correctly rejected for the authenticated `Core3 Demo Company`; this is the
company permission boundary, while isolated integration tests exercise
successful CRUD on the fixture company. Core3 page/request errors are recorded
in `browser-check.json`; the login redirect's known transient route-load error
is excluded from the post-navigation check.

The implementation compares Odoo's `product.product_pricelist_action2` menu
and `product.pricelist.item` model/list/form with Core3's separated
`pages/pricelist-detail.yaml` and `api/pricelist-detail.yaml` contracts.
Migrations `20260920230000-046` and `20260920231000-047` make rule targets,
pricing modes, margins, dates, company-safe mutations, and deterministic demo
data durable. Cart pricing resolves global/product/category rules with fixed,
percentage, and formula modes.

Odoo comparison is blocked: exact unauthenticated requests to `/shop` on both
supplied reference instances returned HTTP 404. The paired blocker captures
are `odoo-8069-desktop-shop.png`, `odoo-8069-mobile-shop.png`,
`odoo-8073-desktop-shop.png`, and `odoo-8073-mobile-shop.png`.

This is a bounded implementation, not Ecommerce module sign-off. Product
variant-specific resolution, currency conversion, external pricing, and a
working Odoo Website/eCommerce reference remain open.
