# ECOM-CATALOG-CATEGORY-COVER-IMAGE-001

Bounded Ecommerce tenth-wave evidence for Website Sale public-category cover
images.

- Core3 implementation: durable category cover-image metadata, deterministic
  fixture, separate category list/detail page and API YAML, authenticated
  upload/download/remove actions, company scope, permissions, validation,
  optimistic row versions, and DuckDB restart persistence.
- Odoo source comparison: `source-comparison.md`.
- Functional and persistence evidence: `functionality.md` and
  `test-results.md`.
- Browser/runtime evidence: `browser-check.md`.
- QA inventory: `qa-inventory.md`.

This is a bounded slice only. Core3 authenticated desktop/mobile rendering was
not signed off because the available Core3 ports were unavailable and this
session has no persistent `js_repl` browser runtime. The supplied authenticated
Odoo references return `/shop` HTTP 404, so paired Odoo comparison is blocked.
