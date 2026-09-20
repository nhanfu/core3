# ECOM-CATALOG-PRODUCT-ALTERNATIVES-001 evidence

Bounded Ecommerce slice: Odoo Website Sale alternative-product
recommendations on Product Detail.

- Odoo source: `alternative_product_ids`,
  `_get_website_alternative_product()`, and the Alternative Products
  recommended-products template section.
- Core3 contracts: `services/ecommerce/pages/product-detail.yaml` and
  `services/ecommerce/api/product-detail.yaml`, joined by
  `page.id: ecommerce-product-detail`.
- Durable schema/data: migrations 066/067 add ordered company-scoped relation
  rows and deterministic Mug → Chair/Lamp fixtures.
- Focused proof: `test/ecommerce_product_alternatives.integration.test.ts` —
  3 tests, 22 assertions.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off.
