# EXPENSE-FUNC-020 functionality checklist

| Case | Acceptance | Result |
| --- | --- | --- |
| F-020-01 | Page remains presentation-only and API binds through `page.id: expenses` | pass |
| F-020-02 | Shared cards use exact Odoo labels and order | pass |
| F-020-03 | Draft, Submitted, and Approved/Employee totals match seeded persisted rows | pass |
| F-020-04 | Other-company rows are excluded | pass |
| F-020-05 | Empty fixture returns deterministic zero cards | pass |
| F-020-06 | Transport failure returns explicit 503 code | pass |
| F-020-07 | Authenticated Odoo desktop observation completed | pass |
| F-020-08 | Authenticated Odoo/Core3 desktop and mobile visual comparison | blocked; no claim |
