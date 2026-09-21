# EMP-CONTRACT-PERIOD-001 evidence

This slice covers Odoo Payroll's version-backed Contract Start and Contract
End dates. Core3 synchronizes the employee display dates with the active
`employee_versions` Payroll record through a manager-gated action.

- `odoo-desktop.png` and `odoo-mobile.png` are authenticated captures of the
  Odoo employee Payroll tab at 1440px and 390px widths.
- `browser.json` records the authenticated URL, viewport, and extracted page
  text. Odoo renders the date range compactly as `Contract Aug 1 to Nov 10`
  rather than exposing the source field labels in the captured form.
- `source-comparison.md` records the supplied Odoo model/view mapping.
- `verification.md` records focused tests and the bounded Core3 runtime
  blocker. This is conditional feature evidence, not aggregate Employees
  sign-off.
