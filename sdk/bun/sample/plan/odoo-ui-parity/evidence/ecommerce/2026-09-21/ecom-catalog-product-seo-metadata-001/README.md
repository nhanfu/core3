# ECOM-CATALOG-PRODUCT-SEO-METADATA-001

Bounded Ecommerce twelfth-wave evidence for Website Sale product SEO metadata.

- Core3 implementation: durable product meta title, description, keywords,
  OpenGraph image path, computed SEO-optimized state, deterministic Mug
  fixture, separate Product Detail page/API YAML, permissioned editing,
  company scope, validation, optimistic concurrency, and DuckDB restart
  persistence.
- Odoo source comparison: `source-comparison.md`.
- Functional and persistence evidence: `functionality.md` and
  `test-results.md`.
- Browser/runtime evidence: `browser-check.md`.
- QA inventory: `qa-inventory.md`.

This is a bounded slice only. Core3 authenticated desktop/mobile rendering was
not signed off because this session has no persistent browser runtime. The
supplied Odoo references return `/shop` HTTP 404, so paired Odoo comparison is
blocked.
