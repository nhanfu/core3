# QA inventory

| Case | Boundary | Result |
| --- | --- | --- |
| Odoo source trace | SEO mixin fields and website head consumption | pass |
| Page/API separation | Product Detail pair and SEO action binding | pass |
| Deterministic fixture | Mug meta fields and optimized projection | pass |
| SEO CRUD | Edit title, description, keywords, OpenGraph path | pass |
| Optimization state | Complete metadata true; cleared description false | pass |
| Permission | SEO mutation requires `ecommerce.write` | pass |
| Company | Other-company product cannot be changed | pass |
| Validation | Length and JavaScript URL boundaries | pass |
| Concurrency | Stale metadata update rejected | pass |
| Restart | Values and row version survive DuckDB reopen | pass |
| Core3 desktop/mobile | Authenticated rendered evidence | blocked: browser runtime unavailable |
| Odoo desktop/mobile | Exact Website Sale comparison | blocked: `/shop` HTTP 404 |

Off-happy-path coverage includes wrong-company, stale-row, over-length, and
unsafe OpenGraph URL requests. Full Ecommerce module sign-off remains open.
