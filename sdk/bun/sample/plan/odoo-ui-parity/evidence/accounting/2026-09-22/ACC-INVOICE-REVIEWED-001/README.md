# ACC-INVOICE-REVIEWED-001 — invoice Reviewed action

Bounded source-backed Accounting action slice for Odoo 19
`account.move.button_set_checked`.

| Artifact | Purpose |
| --- | --- |
| [odoo-analysis.md](odoo-analysis.md) | Local Odoo source contract and live-browser blocker |
| [source-comparison.md](source-comparison.md) | Odoo/Core3 action mapping |
| [functionality-checklist.md](functionality-checklist.md) | Acceptance cases |
| [gap-matrix.md](gap-matrix.md) | Implemented scope and explicit limits |
| [test-results.md](test-results.md) | Focused verification |
| [browser-check.md](browser-check.md) | BrowserSkill ownership result and no-claim boundary |

Core3 adds a durable `checked` flag and a guarded `Reviewed` action to the
invoice detail page/API contract. This is one stable action slice, not
Accounting module completion.

No credentials, cookies, tokens, or screenshots are stored here.
