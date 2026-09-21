# Verification

## Core3

- Authenticated local QA login succeeded on the Employees-only runtime.
- `/employees` rendered the Employees page at 1440x900 and 390x844.
- The current company context returned `0-0 / 0` and the expected empty-state
  copy because the seeded Vietnam employee is outside the Demo Company scope.
- The focused repository query returned only `employee-demo-003` for
  `newly_hired=true` in `Core3 Vietnam`.

## Odoo

- Authenticated `http://localhost:8069/odoo/employees` rendered the Employees
  action at desktop and 390x844 touch emulation.
- The search menu exposed `Newly Hired`; selecting it showed the active filter
  and 8 records at both viewports.

The Core3 populated visual comparison is explicitly blocked by the company
fixture/session mismatch. No aggregate Employees sign-off is claimed.
