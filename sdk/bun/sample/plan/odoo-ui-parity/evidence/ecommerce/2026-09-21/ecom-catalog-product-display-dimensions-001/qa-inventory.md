# QA inventory

| Claim/control | Functional check | Visual state intended | Evidence |
| --- | --- | --- | --- |
| Product dimensions are durable | migration fixture, create/edit, restart | Product Detail Website group | `functionality.md`, `test-results.md` |
| Dimensions are company/permission/concurrency guarded | wrong-company, invalid-range, stale writes | authenticated edit form error states | `functionality.md` |
| Page/API separation is intact | three `page.id` joins and schema validation | Products, Shop, and Product Detail at desktop/mobile | `test-results.md`, `browser-check.md` |
| Odoo source behavior is represented | model/controller source assertions | Odoo shop/product comparison | `source-comparison.md`, `browser-check.md` |

Exploratory/off-happy-path scenarios included: dimensions outside 1–12 and a
stale row-version update. Both leave the durable current row unchanged.
