# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PRODUCT-ACTION-STYLE-001`
- Source field/action: `website.shop_opt_products_design_classes` /
  `o_wsale_products_opt_actions_subtle`,
  `o_wsale_products_opt_actions_promote`, and
  `o_wsale_products_opt_actions_theme`
- Core3 route: `/ecommerce/shop-product-action-style`
- Page/API ID: `ecommerce-shop-product-action-style-policy`
- Schema/data migrations: `0.0.156` / `0.0.157`
- Durable table: `ecommerce_shop_product_action_style_policies`
- Deterministic fixture: My Company, Subtle
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 37 assertions
- Regression: 17 tests / 243 assertions / 0 failures
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Module sign-off: open
