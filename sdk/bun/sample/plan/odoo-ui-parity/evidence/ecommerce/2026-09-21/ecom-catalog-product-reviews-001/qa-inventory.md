# QA inventory

| Case | Boundary | Result |
| --- | --- | --- |
| Odoo source trace | rating mixin, aggregates, Customer Reviews thread | pass |
| Page/API separation | Product Detail pair and review action bindings | pass |
| Deterministic fixture | published Mug review and aggregate | pass |
| Review CRUD | create, edit, publish, reject, delete | pass |
| Moderation | pending/rejected rows excluded from aggregate | pass |
| Permission contract | read datasource and write mutations declared | pass |
| Company | wrong-company create rejected | pass |
| Validation | rating and text boundaries rejected | pass |
| Concurrency | stale edit rejected | pass |
| Restart | content, state, and version survive DuckDB reopen | pass |
| Core3 desktop/mobile | authenticated rendered evidence | blocked: browser runtime unavailable |
| Odoo desktop/mobile | exact Website Sale comparison | blocked: `/shop` HTTP 404 |

Off-happy-path coverage includes wrong-company, invalid rating, stale edit,
moderation reset, rejected aggregate exclusion, and restart recovery. Full
Ecommerce module sign-off remains open.
