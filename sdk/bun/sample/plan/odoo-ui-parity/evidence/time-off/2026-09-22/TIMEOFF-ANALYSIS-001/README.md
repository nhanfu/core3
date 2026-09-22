# TIMEOFF-ANALYSIS-001 — Time Off Analysis report action

Bounded feature: Odoo `hr_leave_report_action` (`Time Off Analysis`) over
`hr.leave.report`, implemented at Core3 `/time-off-analysis`.

Result: conditional bounded pass. The service contract, signed allocation/
request measures, filters, migration replay, empty state, and permissioned
read boundary pass. Odoo and Core3 browser verification are blocked; no visual
parity claim is made.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local Odoo source and live route/action comparison |
| `functionality-checklist.md` | Stable-ID acceptance cases and results |
| `source-comparison.md` | Odoo/Core3 contract mapping |
| `gap-matrix.md` | Missing behavior and implementation mapping |
| `menu-action-inventory.md` | Action/menu/view inventory |
| `test-results.md` | Focused and regression test results |
| `verification.md` | Browser/runtime evidence and exact blockers |
| `odoo-desktop-discuss-blocker.png` | BrowserSkill desktop blocker capture |
| `odoo-mobile-discuss-blocker.png` | BrowserSkill mobile blocker capture |

No credentials, tokens, Odoo mutations, or live-service data are stored here.
