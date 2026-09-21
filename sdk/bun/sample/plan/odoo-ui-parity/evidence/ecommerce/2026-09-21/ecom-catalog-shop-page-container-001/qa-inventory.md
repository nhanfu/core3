# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PAGE-CONTAINER-001`
- Source model: `website.shop_page_container`
- Source template boundary: `website.shop_page_container == 'fluid'`
- Core3 page: `/ecommerce/shop-page-container`
- Page/API ID: `ecommerce-shop-page-container-policy`
- Schema/data migrations: `0.0.138` / `0.0.139`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_shop_page_container_policies`
- Deterministic fixture: `ecommerce-shop-page-container-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 24 assertions
- Regression: 24 passed / 253 assertions
- Audit: blocked by unrelated unstaged Employees page action schema fields
- Scoped ESLint: passed
- Diff-check: passed
- Commit: recorded in the final handoff (not pushed)
- Module sign-off: open
