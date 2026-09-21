# INV-TRANSFER-ALL-QUEUE-001

Bounded source-backed Inventory slice: the operation-type card `All` action,
which opens the Odoo `All Transfers` queue in the selected operation-type
context.

| Artifact | Coverage |
| --- | --- |
| `odoo-analysis.md` | Local Odoo 19 source/action and live-reference attempt |
| `functionality-checklist.md` | Bounded backend, UI, permission, error, and restart cases |
| `source-comparison.md` | Odoo/Core3 mapping and deliberate scope |
| `gap-matrix.md` | Prior gap and implemented contract |
| `test-results.md` | Focused integration and scoped checks |
| `verification.md` | Browser/runtime outcome and exact blockers |
| `browser-results.json` | Redacted bsk session/borrow result; no credentials, cookies, or tokens |

Desktop/mobile screenshots are omitted: the existing authenticated Odoo tab
could not be borrowed through `bsk` (borrow command remained pending and the
session expired), and the shared Core3 runtime was not started for this
bounded contract. No visual-parity claim is made.
