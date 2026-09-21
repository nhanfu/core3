# MANUFACTURING-WCWO-001 — Work Center Work Orders

This folder records the bounded implementation of Odoo 19's record-scoped
`mrp.action_work_orders` action from a Work Center dashboard.

| Artifact | Purpose |
| --- | --- |
| [odoo-analysis.md](odoo-analysis.md) | Local Odoo source and live-reference findings |
| [functionality-checklist.md](functionality-checklist.md) | Stable acceptance cases |
| [source-comparison.md](source-comparison.md) | Odoo/Core3 mapping and reuse decisions |
| [gap-matrix.md](gap-matrix.md) | Bounded gap and implementation matrix |
| [menu-action-inventory.md](menu-action-inventory.md) | Exact source action/menu reachability |
| [api-database-assertions.md](api-database-assertions.md) | YAML/API and durable persistence assertions |
| [permission-results.md](permission-results.md) | Read/write and mutation boundary results |
| [test-results.md](test-results.md) | Focused test/build/diff results |
| [verification.md](verification.md) | Browser evidence and blockers |
| [odoo-desktop-blocker.png](odoo-desktop-blocker.png) | Authenticated desktop blocker capture |
| [odoo-mobile-blocker.png](odoo-mobile-blocker.png) | Authenticated mobile blocker capture |

The Odoo screenshots are blocker evidence, not Manufacturing visual sign-off:
the shared authenticated profile redirected the requested Manufacturing route
to Discuss/OdooBot and exposed no Manufacturing menu.
