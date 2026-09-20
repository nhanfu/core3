# ECOM-CATALOG-VARIANT-BASE-UNIT-PRICING-001 evidence

Bounded Ecommerce slice: Website Sale base-unit pricing for product variants.

- Odoo source: `base_unit_count`, `base_unit_id`, `base_unit_price`,
  `base_unit_name`, the combination response, and the variant-form Price Per
  Unit controls.
- Core3 contracts: `services/ecommerce/pages/product-detail.yaml` and
  `api/product-detail.yaml`, plus the dedicated
  `pages/product-variant-detail.yaml` and
  `api/product-variant-detail.yaml` pair joined by
  `page.id: ecommerce-product-variant-detail`.
- Durable schema/data: migrations 076/077 add variant base-unit metadata and a
  deterministic Mug Blue fixture.
- Focused proof: `test/ecommerce_variant_base_units.integration.test.ts` — 3
  tests, 27 assertions; adjacent Product Variant, Product Detail, and Cart
  tests bring the bounded set to 14 tests and 98 assertions.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off.
