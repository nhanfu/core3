# ECOM-CATALOG-PRODUCT-OPTIONALS-001 evidence

Bounded Ecommerce slice: Odoo optional-product recommendations/configurator
behavior on Product Detail and cart addition.

- Odoo source: `optional_product_ids`, the Sale and Website Sale
  `get_optional_products` configurator routes, and the product-template
  recommendation field.
- Core3 contracts: `services/ecommerce/pages/product-detail.yaml` and
  `services/ecommerce/api/product-detail.yaml`, joined by
  `page.id: ecommerce-product-detail`.
- Durable schema/data: migrations 072/073 add ordered company-scoped relation
  rows and deterministic Mug → Lamp / Chair → Mug fixtures.
- Focused proof: `test/ecommerce_product_optionals.integration.test.ts` —
  3 tests, 25 assertions.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off.
