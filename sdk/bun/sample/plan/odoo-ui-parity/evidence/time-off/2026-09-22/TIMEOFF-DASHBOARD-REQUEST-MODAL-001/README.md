# TIMEOFF-DASHBOARD-REQUEST-MODAL-001

Bounded feature: Odoo `hr_leave_action_my_request` dashboard `Time Off
Request` modal mapped to the Core3 Time Off dashboard.

Result: conditional bounded pass. The YAML page/API seam, active-type lookup,
deterministic Draft persistence, migration replay, permissions, and guards
pass. Authenticated Odoo visual verification is blocked because the requested
`core3_reference` database exposes Discuss rather than the Time Off app.

Evidence files:

- `odoo-analysis.md`: local Odoo source contract and live-reference blocker.
- `functionality-checklist.md`: stable-ID acceptance cases.
- `source-comparison.md`: Odoo/Core3 mapping.
- `gap-matrix.md`: bounded implementation scope.
- `menu-action-inventory.md`: owning action and route inventory.
- `test-results.md`: focused and regression results.
- `verification.md`: BrowserSkill lifecycle and exact blocker.

No credentials, tokens, screenshots, or Odoo mutations are stored here.
