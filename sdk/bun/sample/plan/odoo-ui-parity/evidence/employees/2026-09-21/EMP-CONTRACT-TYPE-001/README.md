# EMP-CONTRACT-TYPE-001 evidence

This bounded slice covers Odoo `hr.version.contract_type_id`, rendered in the
manager-only Payroll Contract Overview and persisted on the employee plus the
current employee version.

## Captures

- `core3-desktop.png`: authenticated Core3 at 1440x900.
- `core3-mobile.png`: authenticated Core3 at 390x844 touch emulation.
- `odoo-desktop.png`: authenticated Odoo `core3_owned` at 1440x900.
- `odoo-mobile.png`: authenticated Odoo `core3_owned` at 390x844 touch emulation.
- `browser.json`: URLs, labels, response/request errors, overflow, and blocker
  observations for all four captures.

## Boundary

Core3 returned HTTP 200 with no page errors, failed requests, or horizontal
overflow and rendered Payroll / Contract Type. The deterministic Employees
row belongs to `Core3 Vietnam`, while the authenticated Admin session is
`Core3 Demo Company`; the row therefore correctly resolves to the empty
detail state and the manager action/value cannot be exercised. This is a
fixture-company blocker, not a permission bypass or a sign-off.

Odoo authenticated Abigail Peterson's Payroll view at both sizes and rendered
Contract Type, but the supplied reference employee has no populated contract
type value. The seven app-icon 404s in `browser.json` are unrelated reference
shell noise.

No aggregate Employees sign-off is claimed.
