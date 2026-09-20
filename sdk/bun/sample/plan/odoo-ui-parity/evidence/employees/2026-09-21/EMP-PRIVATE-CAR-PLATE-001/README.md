# EMP-PRIVATE-CAR-PLATE-001

Bounded Wave 14 evidence for the Odoo HR employee private car plate
search/list behavior.

- Odoo authenticated desktop/mobile captures: `odoo-desktop.png`,
  `odoo-mobile.png`.
- Odoo route: `http://127.0.0.1:8069/odoo/employees`.
- Core3 browser capture: blocked during the bounded attempt; backend port 3001
  never bound. See `browser.json` and `verification.md`.
- The source field is optional/hidden in Odoo's default list rendering, so the
  captures prove the authenticated Employees surface and the exact visibility
  limitation rather than claiming a visible plate column.

This is conditional feature evidence, not aggregate Employees sign-off.
