# ECOM-CATALOG-PRODUCT-DOCUMENTS-001

Bounded Ecommerce ninth-wave evidence for Website Sale product documents.

- Core3 implementation: durable product-template document metadata and local
  attachment storage, separate Product Detail and Product Document page/API
  YAML contracts, published-on-product-page toggle, upload/download, delete,
  company scope, permissions, row-version guards, deterministic fixture, and
  restart persistence.
- Odoo source comparison: `source-comparison.md`.
- Functional and persistence evidence: `functionality.md` and
  `test-results.md`.
- Browser/runtime evidence: `browser-check.md`.
- QA inventory: `qa-inventory.md`.

This is a bounded slice only. Core3 authenticated desktop/mobile rendering was
not signed off because the available Core3 ports were unavailable and this
session has no persistent `js_repl` browser runtime. The supplied authenticated
Odoo references return `/shop` HTTP 404, so paired Odoo comparison is blocked.
