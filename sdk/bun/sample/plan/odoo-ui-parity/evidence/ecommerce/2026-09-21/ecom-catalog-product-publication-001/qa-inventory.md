# QA inventory

| Case | Boundary | Result |
| --- | --- | --- |
| Odoo source trace | Published mixin, publish date, product view controls | pass |
| Page/API separation | Products and Product Detail pairs | pass |
| Deterministic fixtures | Published timestamps and unpublished setup product | pass |
| Publish | Active product becomes visible in Shop | pass |
| Unpublish | Shop visibility is removed and timestamp cleared | pass |
| Permission | Publish/unpublish require `ecommerce.write` | pass |
| Company | Other-company product cannot be changed | pass |
| Concurrency | Stale publish request is rejected | pass |
| Restart | State/timestamp survive migration replay and DuckDB reopen | pass |
| Core3 desktop/mobile | Authenticated rendered evidence | blocked: browser runtime unavailable |
| Odoo desktop/mobile | Exact Website Sale comparison | blocked: `/shop` HTTP 404 |

Two off-happy-path cases are included: wrong-company publication and stale
publication after a newer unpublish. Full Ecommerce module sign-off remains
open.
