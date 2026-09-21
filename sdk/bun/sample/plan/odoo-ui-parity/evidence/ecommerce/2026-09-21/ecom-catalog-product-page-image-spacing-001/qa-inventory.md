# QA inventory

- Feature: `ECOM-CATALOG-PRODUCT-PAGE-IMAGE-SPACING-001`
- Source model: `website.product_page_image_spacing`
- Source template boundary: `data-image_spacing`
- Core3 page: `/ecommerce/product-page-image-spacing`
- Page/API ID: `ecommerce-product-page-image-spacing-policy`
- Schema/data migrations: `0.0.130` / `0.0.131`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_product_page_image_spacing_policies`
- Deterministic fixture: `ecommerce-product-page-image-spacing-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 26 assertions
- Regression: 13 passed / 129 assertions
- Audit: 744 pages / 753 routes / 1478 datasources
- Scoped ESLint: passed
- Commit: `cafc7605` (local, not pushed)
- Module sign-off: open
