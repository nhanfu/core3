# QA inventory

- Feature: `ECOM-CATALOG-PRODUCT-PAGE-CONTAINER-001`
- Source model: `website.product_page_container`
- Source template boundary: `_get_product_page_container()`
- Core3 page: `/ecommerce/product-page-container`
- Page/API ID: `ecommerce-product-page-container-policy`
- Schema/data migrations: `0.0.136` / `0.0.137`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_product_page_container_policies`
- Deterministic fixture: `ecommerce-product-page-container-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 25 assertions
- Regression: 19 passed / 204 assertions
- Audit: 749 pages / 758 routes / 1499 datasources
- Scoped ESLint: passed
- Commit: `8514fadf` (pushed)
- Module sign-off: open
