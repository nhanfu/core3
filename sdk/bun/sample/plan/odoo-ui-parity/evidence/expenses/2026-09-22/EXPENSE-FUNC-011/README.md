# EXPENSE-FUNC-011 evidence

This folder records the Expenses-only activity scheduling/completion feature.
It maps Odoo `hr.expense` `mail.activity.mixin` / `activity_ids` behavior to
the Core3 expense detail chatter. Screenshots contain authenticated application
UI only; no credentials, cookies, tokens, or passwords are stored.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Odoo source and live-reference inventory |
| `functionality-checklist.md` | Bounded acceptance cases |
| `source-comparison.md` | Current Core3 gap and changed paths |
| `gap-matrix.md` | Source-to-implementation mapping |
| `test-results.md` | Focused, regression, audit, CSS, and diff results |
| `verification.md` | Browser captures, dimensions, and blockers |
| `odoo-activity-desktop-1440x900.png` | Authenticated Odoo desktop activity surface |
| `odoo-activity-mobile-390x844.png` | Authenticated Odoo mobile activity surface |

Core3 screenshots are included only if an authenticated Core3 runtime is
available during this candidate. A missing Core3 login/runtime is recorded as
an exact blocker in `verification.md`, not treated as a pass.
