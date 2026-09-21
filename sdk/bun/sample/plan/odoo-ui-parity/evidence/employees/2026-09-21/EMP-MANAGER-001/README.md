# EMP-MANAGER-001 evidence

This slice covers the Odoo `hr.employee.parent_id` Manager relation in the
employee Work tab. Core3 persists the relation as `manager_id`, keeps the
`manager_name` display projection, and synchronizes the organization-chart
parent.

- `odoo-desktop.png` and `odoo-mobile.png` are authenticated captures at
  1440px and 390px widths.
- `browser.json` records the authenticated URL, viewport, Manager visibility,
  and captured page text.
- `source-comparison.md` records the supplied Odoo model/view mapping.
- `verification.md` records focused tests and the bounded Core3 runtime
  blocker. This is conditional feature evidence, not aggregate Employees
  sign-off.
