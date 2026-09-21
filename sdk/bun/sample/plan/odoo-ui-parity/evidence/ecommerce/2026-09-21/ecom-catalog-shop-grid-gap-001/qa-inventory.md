# QA inventory

- Feature: `ECOM-CATALOG-SHOP-GRID-GAP-001`
- Source model: `website.shop_gap`
- Source action: `setGap` via Products Design Panel and `/shop/config/website`
- Core3 page: `/ecommerce/shop-grid-gap`
- Page/API ID: `ecommerce-shop-grid-gap-policy`
- Schema/data migrations: `0.0.144` / `0.0.145`
- Permission boundary: `ecommerce.read` / `ecommerce.write`
- Durable table: `ecommerce_shop_grid_gap_policies`
- Deterministic fixture: `ecommerce-shop-grid-gap-my-company`
- Browser evidence: blocked; see [browser-check.md](browser-check.md)
- Focused tests: 2 passed / 30 assertions
- Regression: 14 passed / 160 assertions
- Audit: 755 pages / 764 routes / 1528 datasources
- Scoped ESLint: passed
- Diff-check: passed
- Commit: recorded in the final handoff (not pushed)
- Module sign-off: open
