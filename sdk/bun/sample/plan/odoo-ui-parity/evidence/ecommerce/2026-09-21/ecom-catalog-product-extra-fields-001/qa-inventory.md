# QA inventory

- Feature: `ECOM-CATALOG-PRODUCT-EXTRA-FIELDS-001`
- Source model: `website.sale.extra.field`
- Source settings relation: `website.shop_extra_field_ids`
- Core3 route: `/ecommerce/product-extra-fields`
- Page/API ID: `ecommerce-product-extra-fields`
- Schema/data migrations: `0.0.146` / `0.0.147`
- Durable table: `ecommerce_product_extra_fields`
- Deterministic fixtures: My Company `internal_reference`, `category`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 35 assertions
- Regression: 12 tests / 110 assertions
- Audit: 756 pages / 765 routes / 1534 datasources
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Module sign-off: open
