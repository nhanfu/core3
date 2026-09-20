# ECOM-CATALOG-WISHLIST-001 evidence

Bounded Ecommerce slice: Odoo `website_sale_wishlist` parity for durable
wishlist add/list/remove behavior, anonymous cookie ownership, duplicate
prevention, product publication guards, and responsive list/API contracts.

- Core3 contracts: `services/ecommerce/pages/wishlist.yaml` and
  `services/ecommerce/api/wishlist.yaml`, joined by `page.id`.
- Durable schema/data: migrations `062` and `063`.
- Public boundary: `/api/public/ecommerce/wishlist` and item DELETE routes in
  `services/ecommerce/module.ts`, backed by the YAML actions/operation.
- Focused proof: `test/ecommerce_wishlist.integration.test.ts` — 4 tests,
  31 assertions.
- UI audit: 690 pages, 699 routes, 1284 datasources; passed.
- Odoo HTTP comparison: both supplied references return exact `/shop` HTTP 404.
- Core3 authenticated desktop/mobile capture: blocked because no local Core3
  HTTP listener was available at ports 3000, 4312, or 4313; no UI pass is
  claimed from YAML/service tests.

This is a bounded slice, not Ecommerce module sign-off. Wishlist session merge
after login, broader actor/browser coverage, and paired Odoo rendered evidence
remain open.
