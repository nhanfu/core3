# QA inventory

- Feature: `ECOM-CATALOG-SHOP-PAGE-SIZE-001`
- Source model: `website.shop_ppg`
- Source action: `SetPpgAction` via `/shop/config/website`
- Core3 page: `/ecommerce/shop-page-size`
- Page/API ID: `ecommerce-shop-page-size-policy`
- Schema/data migrations: `0.0.142` / `0.0.143`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_shop_page_size_policies`
- Deterministic fixture: `ecommerce-shop-page-size-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 26 assertions
- Regression: 12 passed / 130 assertions
- Audit: 754 pages / 763 routes / 1522 datasources
- Scoped ESLint: passed
- Diff-check: passed
- Commit: recorded in the final handoff (not pushed)
- Module sign-off: open
