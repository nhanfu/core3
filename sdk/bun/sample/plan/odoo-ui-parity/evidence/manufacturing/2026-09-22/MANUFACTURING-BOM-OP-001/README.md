# MANUFACTURING-BOM-OP-001 — BoM Operations Performance

This folder records the bounded implementation of Odoo 19's record-scoped
BoM `Operations Performance` action.

| Artifact | Purpose |
| --- | --- |
| [odoo-analysis.md](odoo-analysis.md) | Local Odoo source and live-reference findings |
| [functionality-checklist.md](functionality-checklist.md) | Stable acceptance cases |
| [source-comparison.md](source-comparison.md) | Odoo/Core3 mapping and reuse decisions |
| [gap-matrix.md](gap-matrix.md) | Bounded implementation matrix |
| [api-database-assertions.md](api-database-assertions.md) | API, migration, and restart assertions |
| [permission-results.md](permission-results.md) | Permission and read-only action boundary |
| [test-results.md](test-results.md) | Focused test result |
| [verification.md](verification.md) | Browser evidence and blocker |
| [odoo-desktop-blocker.png](odoo-desktop-blocker.png) | Authenticated desktop blocker capture |
| [odoo-mobile-blocker.png](odoo-mobile-blocker.png) | Authenticated mobile blocker capture |

The Odoo screenshots are blocker evidence, not Manufacturing visual sign-off:
the shared authenticated profile redirected the requested BoM route to
Discuss/OdooBot and exposed no Manufacturing menu.
