# QA inventory

- Feature: `ECOM-CATALOG-SHOP-GRID-COLUMNS-001`
- Source model: `website.shop_ppr`
- Source action: `SetPprAction` via `/shop/config/website`
- Core3 page: `/ecommerce/shop-grid-columns`
- Page/API ID: `ecommerce-shop-grid-columns-policy`
- Schema/data migrations: `0.0.140` / `0.0.141`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_shop_grid_columns_policies`
- Deterministic fixture: `ecommerce-shop-grid-columns-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 26 assertions
- Regression: 10 passed / 104 assertions
- Audit: 753 pages / 762 routes / 1519 datasources
- Scoped ESLint: passed
- Diff-check: passed
- Commit: recorded in the final handoff (not pushed)
- Module sign-off: open
