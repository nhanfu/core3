# QA inventory

| Claim/control | Functional check | Visual state intended | Evidence |
| --- | --- | --- | --- |
| Product/category assignments are durable | fixture, assign, edit, remove, restart | Product Detail Website Categories ListView | `functionality.md`, `test-results.md` |
| Scope and concurrency are enforced | wrong company, inactive category, duplicate, invalid sequence, stale writes | permission and validation states at desktop/mobile | `functionality.md` |
| Page/API separation is intact | matching `page.id` and schema validation | Product Detail at desktop/mobile | `test-results.md`, `browser-check.md` |
| Odoo menu/action/model behavior is represented | model/view/menu/search source assertions | Odoo Website Products comparison | `source-comparison.md`, `browser-check.md` |

Exploratory/off-happy-path scenarios included: assigning an inactive category
and replaying an old relation row version. Both leave the current assignment
set unchanged.
