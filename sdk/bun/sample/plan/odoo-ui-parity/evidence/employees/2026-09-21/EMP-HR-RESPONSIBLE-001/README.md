# EMP-HR-RESPONSIBLE-001 evidence

This bounded slice covers Odoo `hr.version.hr_responsible_id`, rendered in the
employee Settings → Approvers group and persisted on the employee plus its
current active employee version.

## Captures

- `core3-desktop.png`: authenticated Core3 at 1440x900.
- `core3-mobile.png`: authenticated Core3 at 390x844 touch emulation.
- `odoo-desktop.png`: authenticated Odoo `core3_owned` at 1440x900.
- `odoo-mobile.png`: authenticated Odoo `core3_owned` at 390x844 touch emulation.
- `browser.json`: QA inventory, URLs, labels, request/response errors,
  viewport-fit data, and blockers for all four captures.

## Boundary

Core3 returned HTTP 200 with no page errors, failed requests, or horizontal
overflow and rendered Settings / Approvers / HR Responsible. The deterministic
employee is in `Core3 Vietnam`, while the authenticated Admin session is
`Core3 Demo Company`; the employee values and edit action therefore remain
hidden by the intended company scope. This is a fixture-company blocker, not a
permission bypass or sign-off.

Odoo authenticated Abigail Peterson's Settings view at both sizes and rendered
the source HR Responsible control, but the supplied reference employee has no
populated approver. The seven app-icon 404s in `browser.json` are unrelated
reference-shell noise.

No aggregate Employees sign-off is claimed.
