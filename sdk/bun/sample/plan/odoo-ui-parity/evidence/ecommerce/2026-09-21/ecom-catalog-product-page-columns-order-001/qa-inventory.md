# QA inventory

- Feature: `ECOM-CATALOG-PRODUCT-PAGE-COLUMNS-ORDER-001`
- Source model: `website.product_page_cols_order`
- Source template boundary: `flex-lg-row-reverse` on `product_detail_main`
- Core3 page: `/ecommerce/product-page-columns-order`
- Page/API ID: `ecommerce-product-page-columns-order-policy`
- Schema/data migrations: `0.0.134` / `0.0.135`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_product_page_columns_order_policies`
- Deterministic fixture: `ecommerce-product-page-columns-order-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 24 assertions
- Regression: 17 passed / 179 assertions
- Audit: 748 pages / 757 routes / 1493 datasources
- Scoped ESLint: passed
- Commit: `f88b6af4` (local, not pushed)
- Module sign-off: open
