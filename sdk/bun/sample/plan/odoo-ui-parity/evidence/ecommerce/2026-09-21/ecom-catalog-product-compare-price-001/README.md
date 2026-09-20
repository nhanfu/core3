# ECOM-CATALOG-PRODUCT-COMPARE-PRICE-001 evidence

Bounded Ecommerce slice: Website Sale compare-at/list prices for products and
product variants.

- Odoo source: `compare_list_price`, the greater-than-actual-price
  strikethrough boundary, and the Website Sale product form control.
- Core3 contracts: separate Products, Shop, Product Detail, and Product
  Variant page/API YAML pairs; all joins remain by matching `page.id`.
- Durable schema/data: migrations 078/079 add product/variant compare prices
  and deterministic Mug/Mug Blue fixtures.
- Focused proof: `test/ecommerce_product_compare_price.integration.test.ts` —
  3 tests, 33 assertions; adjacent catalog regressions are recorded in
  `test-results.md`.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off.
