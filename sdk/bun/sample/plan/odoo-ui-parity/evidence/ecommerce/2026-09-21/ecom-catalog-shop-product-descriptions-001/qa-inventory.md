# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PRODUCT-DESCRIPTIONS-001`
- Source field/action: `website.shop_opt_products_design_classes` /
  `o_wsale_products_opt_has_description` and `/shop/config/website`
- Core3 route: `/ecommerce/shop-product-descriptions`
- Page/API ID: `ecommerce-shop-product-descriptions-policy`
- Schema/data migrations: `0.0.150` / `0.0.151`
- Durable table: `ecommerce_shop_product_description_policies`
- Deterministic fixture: My Company, descriptions visible
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 29 assertions
- Regression: bounded Shop run had 10 passes plus one existing timeout; the
  timeout rerun passed 2 tests / 26 assertions
- Local commit: `f12a1362eb7dc669cadf39c5a7ad88f226fdac4a` (not pushed)
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Module sign-off: open
