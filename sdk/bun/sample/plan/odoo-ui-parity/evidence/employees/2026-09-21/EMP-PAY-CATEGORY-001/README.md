# EMP-PAY-CATEGORY-001

Wave 15 evidence for the Odoo Payroll Pay Category field.

- Odoo authenticated employee detail captures: `odoo-desktop.png` and
  `odoo-mobile.png`.
- Odoo route: `http://127.0.0.1:8069/odoo/employees/6`.
- The mobile Payroll tab visibly rendered `Pay Category`; the desktop bounded
  interaction remained on Work after authentication. Both captures are still
  useful authenticated desktop/mobile comparison evidence, with the exact
  interaction result recorded in `browser.json`.
- Core3 browser capture was blocked because memory-mode Vite started but the
  backend on port 3001 never bound. No Core3 screenshot or sign-off is claimed.

Unrelated Odoo shell app-icon 404s and the Core3 runtime blocker are recorded
explicitly. This is conditional feature evidence, not aggregate Employees
sign-off.
