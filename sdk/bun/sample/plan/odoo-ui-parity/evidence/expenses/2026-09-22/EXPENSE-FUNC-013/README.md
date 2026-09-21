# EXPENSE-FUNC-013 - My Expenses Activity view

This bounded slice adds the Odoo `hr_expense` Activity view to Core3 My
Expenses. The page remains presentation-only and is joined to the service API
through `page.id: expenses`.

| Artifact | Verification |
| --- | --- |
| `odoo-analysis.md` | Local Odoo source and live authenticated reference |
| `functionality-checklist.md` | Bounded behavior and acceptance cases |
| `source-comparison.md` | Odoo-to-Core3 gap and implementation mapping |
| `gap-matrix.md` | Source-backed coverage matrix |
| `test-results.md` | Focused, regression, audit, build, and diff results |
| `verification.md` | Browser captures and Core3 capture blocker |
| `odoo-activity-desktop-1916x833.png` | Authenticated Odoo desktop reference |
| `odoo-activity-mobile-390x844.png` | Authenticated Odoo mobile reference |

No credentials, cookies, tokens, or passwords are stored. Core3 visual parity
is not claimed without an authenticated Core3 capture.
