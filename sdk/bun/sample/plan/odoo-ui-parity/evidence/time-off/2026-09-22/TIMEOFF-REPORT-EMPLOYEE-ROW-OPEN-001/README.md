# TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001

Bounded feature: Odoo `action_hr_available_holidays_report` form-mode row
drilldown from `Reporting > By Employee` to the existing Leave Request form.

Result: conditional bounded pass. The page/API contract, stable request-ID
navigation, read permission, and source mapping pass. Authenticated Odoo
desktop/mobile inspection was blocked before navigation because the only
normal signed-in Odoo tab was already borrowed by another BrowserSkill session.
No visual-parity claim is made.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local source and live BrowserSkill gate result |
| `functionality-checklist.md` | Stable-ID acceptance cases |
| `source-comparison.md` | Odoo/Core3 contract mapping |
| `gap-matrix.md` | Missing behavior and bounded implementation |
| `menu-action-inventory.md` | Action/menu/view inventory |
| `test-results.md` | Focused test result |
| `verification.md` | Browser cleanup and visual-evidence limitation |

No credentials, tokens, screenshots, or Odoo mutations are stored here.
