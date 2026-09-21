# Event attendee answer editor

Stable feature ID: `event-attendee-answer-editor`

This evidence covers the Odoo-backed Questions one-to-many editor on the
attendee registration form and the Core3 durable line CRUD implementation.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local Odoo 19 model/view/action contract |
| `functionality-checklist.md` | Stable functional, permission, persistence, and browser cases |
| `source-comparison.md` | Odoo-to-Core3 mapping and residuals |
| `gap-matrix.md` | Implemented slice and explicit blockers |
| `test-results.md` | Focused test, audit, lint, and diff evidence |
| `verification.md` | Authenticated browser results and capture hashes |

Screenshots are intentionally not committed. The authenticated Odoo captures
remain at the reproducible local paths recorded in `verification.md`. Core3
captures were not rerun in this checkpoint; the absence is recorded rather
than inferred as parity.
