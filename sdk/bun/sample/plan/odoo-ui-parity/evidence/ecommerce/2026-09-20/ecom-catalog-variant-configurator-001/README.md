# ECOM-CATALOG-VARIANT-CONFIGURATOR-001

Bounded Ecommerce evidence for selected product-variant cart resolution.

- Core3 target: Product Detail variant row -> Add to Cart -> durable cart line.
- Odoo target: `website_sale/get_combination_info` selected-combination
  resolution into a concrete `product.product`.
- QA status: bounded implementation verified; Ecommerce module sign-off is
  intentionally open.
- Core3 desktop/mobile capture: blocked before authenticated navigation by the
  shared Inventory YAML discovery error recorded in `browser-check.md`.
- Odoo paired capture: blocked because authenticated `/shop` is HTTP 404 on
  both supplied references.
