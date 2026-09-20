# ECOM-CATALOG-PRODUCT-WEBSITE-DESCRIPTION-001 evidence

Bounded Ecommerce slice: Website Sale product website descriptions.

- Odoo source: HTML `website_description`, description search, and the
  customer-facing product detail rendering seam.
- Core3 contracts: separate Products, Shop, and Product Detail page/API YAML
  pairs joined by matching `page.id`.
- Durable schema/data: migrations 080/081 add product website-description
  storage and a deterministic Mug fixture.
- Focused proof: `test/ecommerce_product_website_description.integration.test.ts`
  — 3 tests, 24 assertions; adjacent catalog regressions are recorded in
  `test-results.md`.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off.
