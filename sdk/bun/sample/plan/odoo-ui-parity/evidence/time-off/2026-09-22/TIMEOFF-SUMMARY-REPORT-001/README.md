# TIMEOFF-SUMMARY-REPORT-001

Bounded feature: the installed Odoo `action_report_holidayssummary` QWeb-PDF
report reached by the employee Time Off Summary wizard.

Result: conditional bounded pass. Core3 now records a durable, deterministic
60-day PDF report run with the Odoo report action, template, paper format,
filename, date range, and summary measures. The page/API contracts remain
separate and joined by `page.id`. Authenticated Odoo and Core3 visual capture
was blocked; no visual-parity claim is made.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local source and live BrowserSkill gate result |
| `functionality-checklist.md` | Stable-ID acceptance cases |
| `source-comparison.md` | Odoo/Core3 contract mapping |
| `gap-matrix.md` | Missing report behavior and bounded implementation |
| `menu-action-inventory.md` | Action/menu/report inventory |
| `test-results.md` | Focused and regression test results |
| `verification.md` | Browser cleanup and capture limitation |

The blocker captures remain outside Git under
`/tmp/core3-odoo-parity/timeoff-summary-report-20260922/`.

No credentials, tokens, or Odoo mutations are stored here.
