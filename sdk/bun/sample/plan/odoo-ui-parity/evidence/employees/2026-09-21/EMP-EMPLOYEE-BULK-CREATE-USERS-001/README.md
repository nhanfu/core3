# EMP-EMPLOYEE-BULK-CREATE-USERS-001 evidence

Date: 2026-09-21

Source action: Odoo `hr.employee.action_create_users`, bound as
`action_hr_employee_create_users` in the Employees list server actions.

Core3 authenticated captures:

- `core3-desktop.png` — authenticated `admin@tms.local`, `/employees`, 1440x900;
  no request failures. The deterministic Employees rows are company-scoped to
  `Core3 Vietnam`, while this session defaults to `Core3 Demo Company`, so the
  list is empty and the selection-dependent `Create Users` button is not
  rendered.
- `core3-mobile.png` — same authenticated session contract at 390x844;
  no request failures or overflow; the empty-state company mismatch remains.

Odoo comparison captures:

- `odoo-login-desktop.png` and `odoo-login-mobile.png` capture the available
  local login surface at `http://127.0.0.1:8069/web/login`.
- The supplied local probe attempted `admin/admin` once and received Odoo's
  `Wrong login/password`; the authenticated Employees list/action could not be
  reached. No Odoo parity sign-off is claimed.

Runtime probe: isolated Core3 ports 3301/3302, authenticated by the seeded demo
credentials. This evidence is conditional and does not replace authenticated
feature interaction proof.
