# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PRODUCT-CTA-VISIBILITY-001`
- Source field/action: `website.shop_opt_products_design_classes` /
  `o_wsale_products_opt_has_cta` and `/shop/config/website`
- Core3 route: `/ecommerce/shop-product-cta`
- Page/API ID: `ecommerce-shop-product-cta-policy`
- Schema/data migrations: `0.0.152` / `0.0.153`
- Durable table: `ecommerce_shop_product_cta_policies`
- Deterministic fixture: My Company, Add to Cart visible
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 34 assertions
- Regression: 13 tests / 170 assertions / 0 failures
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Module sign-off: open
