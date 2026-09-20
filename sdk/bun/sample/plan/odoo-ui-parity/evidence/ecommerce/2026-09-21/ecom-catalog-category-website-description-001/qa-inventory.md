# QA inventory

| Case | Boundary | Result |
| --- | --- | --- |
| Odoo source trace | category menu/action, form field, shop template | pass |
| Page/API separation | Category Detail pair and action binding | pass |
| Deterministic fixture | Accessories category HTML | pass |
| Description lifecycle | edit and clear content | pass |
| Permission contract | datasource read and write mutation declared | pass |
| Company | wrong-company update rejected | pass |
| Validation | unsafe script and 10,000-character boundary | pass |
| Concurrency | stale row update rejected | pass |
| Restart | HTML and row version survive DuckDB reopen | pass |
| Core3 desktop/mobile | authenticated rendered evidence | blocked: browser runtime unavailable |
| Odoo desktop/mobile | exact Website Sale comparison | blocked: `/shop` HTTP 404 |

Off-happy-path coverage includes wrong-company, inactive/stale row, unsafe
script, over-length, clear-to-NULL, and restart recovery. Full Ecommerce
module sign-off remains open.
