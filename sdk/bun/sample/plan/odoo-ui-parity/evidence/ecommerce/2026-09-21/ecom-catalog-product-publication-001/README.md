# ECOM-CATALOG-PRODUCT-PUBLICATION-001

Bounded Ecommerce eleventh-wave evidence for Website Sale product publication.

- Core3 implementation: durable `publish_date`, deterministic published
  fixtures, separate Products/Product Detail page/API contracts, explicit
  publish/unpublish actions, current-company permission guards, optimistic
  concurrency, active-product validation, public-shop visibility, and DuckDB
  restart persistence.
- Odoo source comparison: `source-comparison.md`.
- Functional and persistence evidence: `functionality.md` and
  `test-results.md`.
- Browser/runtime evidence: `browser-check.md`.
- QA inventory: `qa-inventory.md`.

This is a bounded slice only. Core3 authenticated desktop/mobile rendering was
not signed off because this session has no persistent browser runtime. The
supplied Odoo references return `/shop` HTTP 404, so paired Odoo comparison is
blocked.
