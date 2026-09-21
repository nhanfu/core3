# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PRODUCT-RATINGS-VISIBILITY-001`
- Source field/action: `website.shop_opt_products_design_classes` /
  `o_wsale_products_opt_has_rating`
- Core3 route: `/ecommerce/shop-product-ratings`
- Page/API ID: `ecommerce-shop-product-ratings-policy`
- Schema/data migrations: `0.0.158` / `0.0.159`
- Durable table: `ecommerce_shop_product_rating_policies`
- Deterministic fixture: My Company, hidden ratings
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 35 assertions
- Regression: 22 tests / 307 assertions / 0 failures
- Browser evidence: authenticated Odoo `/shop` 404 at desktop/mobile; see
  [browser-check.md](browser-check.md)
- Module sign-off: open
