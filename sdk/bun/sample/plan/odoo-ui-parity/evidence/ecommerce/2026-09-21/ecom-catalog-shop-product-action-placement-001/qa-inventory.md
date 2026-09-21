# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PRODUCT-ACTION-PLACEMENT-001`
- Source field/action: `website.shop_opt_products_design_classes` /
  `o_wsale_products_opt_actions_inline` and
  `o_wsale_products_opt_actions_onhover`
- Core3 route: `/ecommerce/shop-product-action-placement`
- Page/API ID: `ecommerce-shop-product-action-placement-policy`
- Schema/data migrations: `0.0.154` / `0.0.155`
- Durable table: `ecommerce_shop_product_action_placement_policies`
- Deterministic fixture: My Company, On Hover
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 36 assertions
- Regression: 15 tests / 206 assertions / 0 failures
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Module sign-off: open
