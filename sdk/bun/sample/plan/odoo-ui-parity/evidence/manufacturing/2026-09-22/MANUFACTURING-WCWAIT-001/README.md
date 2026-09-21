# MANUFACTURING-WCWAIT-001

Bounded feature: Work Center dashboard `Waiting Availability` action.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local Odoo 19 source and live-reference comparison |
| `menu-action-inventory.md` | Exact source action, context, modes, and route mapping |
| `functionality-checklist.md` | Feature acceptance cases and results |
| `source-comparison.md` | Odoo/Core3 implementation classification |
| `gap-matrix.md` | Bounded gap and implementation mapping |
| `api-database-assertions.md` | Datasource and durable persistence assertions |
| `permission-results.md` | Read/write and hidden-action boundaries |
| `test-results.md` | Focused test output |
| `verification.md` | Browser captures, dimensions, and blockers |

The Odoo Manufacturing surface was not visually captured because the
authenticated browser instance redirected `/odoo/work-centers` and
`?db=core3_reference` to Discuss/OdooBot. No visual Odoo parity claim is made.

Core3 captures remain outside Git under `/tmp` as required:

- `/tmp/core3-manufacturing-work-center-waiting-1440x900.png` (1440x719 browser viewport)
- `/tmp/core3-manufacturing-work-center-waiting-390x844.png` (390x844)
- `/tmp/odoo-manufacturing-work-center-waiting-blocker-desktop.png` (1440x719)
- `/tmp/odoo-manufacturing-work-center-waiting-blocker-mobile.png` (390x844)

The Odoo blocker screenshots are also retained in this evidence folder as
`odoo-desktop-blocker.png` and `odoo-mobile-blocker.png`.
