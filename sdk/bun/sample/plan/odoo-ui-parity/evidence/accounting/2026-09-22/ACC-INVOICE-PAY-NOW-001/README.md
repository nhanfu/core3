# ACC-INVOICE-PAY-NOW-001 — invoice Pay Now workflow

Bounded source-backed Accounting/Invoicing slice for Odoo 19's portal payment
flow. This feature starts a durable pending payment transaction from a posted
customer invoice or credit-note Preview page; it does not claim provider
completion or invoice settlement.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local Odoo source and live-reference context |
| `functionality-checklist.md` | Smallest-feature acceptance cases |
| `source-comparison.md` | Odoo/Core3 contract comparison |
| `gap-matrix.md` | Implemented gap and remaining boundaries |
| `test-results.md` | Focused integration and regression results |
| `verification.md` | Browser verification and explicit blocker |
| `browser-check.md` | BrowserSkill session/tab evidence |

No credentials, cookies, tokens, or screenshots are stored for this feature.
The existing Preview evidence contains the Pay Now control visible in the
authenticated Odoo portal preview; this feature's live click was blocked by
the tab being owned by another active BrowserSkill session.
