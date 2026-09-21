# QA inventory

- Feature: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-ROUNDNESS-001`
- Source model: `website.product_page_image_roundness`
- Source template boundary: product-page image radius class
- Core3 page: `/ecommerce/product-page-image-roundness`
- Page/API ID: `ecommerce-product-page-image-roundness-policy`
- Schema/data migrations: `0.0.132` / `0.0.133`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_product_page_image_roundness_policies`
- Deterministic fixture: `ecommerce-product-page-image-roundness-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 26 assertions
- Regression: 15 passed / 155 assertions
- Audit: 747 pages / 756 routes / 1490 datasources
- Scoped ESLint: passed
- Commit: `2cc62edd` (local, not pushed)
- Module sign-off: open
