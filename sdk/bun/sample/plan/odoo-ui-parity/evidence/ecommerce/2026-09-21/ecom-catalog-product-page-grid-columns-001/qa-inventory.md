# QA inventory

- Feature: `ECOM-CATALOG-PRODUCT-PAGE-GRID-COLUMNS-001`
- Source field/action: `website.product_page_grid_columns` /
  `productPageImageGridColumns`
- Core3 route: `/ecommerce/product-page-grid-columns`
- Page/API ID: `ecommerce-product-page-grid-columns-policy`
- Schema/data migrations: `0.0.148` / `0.0.149`
- Durable table: `ecommerce_product_page_grid_columns_policies`
- Deterministic fixture: My Company, 2 columns
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Focused: 2 tests / 30 assertions
- Regression: 17 tests / 193 assertions
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Module sign-off: open
