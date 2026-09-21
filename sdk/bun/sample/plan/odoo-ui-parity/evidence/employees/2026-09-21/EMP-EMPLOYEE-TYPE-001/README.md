# EMP-EMPLOYEE-TYPE-001 evidence

This slice covers Odoo's Payroll `hr.version.employee_type` selection. Core3
persists the normalized source value on both the employee and active Payroll
version, while retaining the legacy `employment_type` display projection for
existing employee list and CRUD contracts.

- `odoo-desktop.png` and `odoo-mobile.png` are authenticated captures of the
  Odoo employee Payroll tab at 1440px and 390px widths.
- `browser.json` records the authenticated URL, viewport, Employee Type
  visibility, and extracted page text.
- `source-comparison.md` records the supplied Odoo model/view mapping.
- `verification.md` records focused tests and the bounded Core3 runtime
  blocker. This is conditional feature evidence, not aggregate Employees
  sign-off.
