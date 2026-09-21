# EMP-EMPLOYEE-ACTIVITY-001 evidence

Feature: one-off Employee chatter activity scheduling, distinct from Launch
Plan. Odoo source comparison is anchored to
`/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py:40`, where
`hr.employee` inherits `mail.activity.mixin`, and
`/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml:413`, where
the Employee form renders `<chatter reload_on_follower="True"/>`.

## Core3

- `core3-browser.json` records authenticated `admin@tms.local` desktop and
  mobile probes against `/employees/detail?id=employee-demo-001`.
- `core3-desktop.png` and `core3-mobile.png` show the Employee detail and the
  new `Schedule activity` chatter control.
- Both viewports had no request failures, page errors, console errors, or
  horizontal overflow. The authenticated page loaded the shell and activity
  control, but the employee fixture fields were blank because the deterministic
  fixture company is `Core3 Vietnam` and the authenticated session company is
  different; the resulting company-scope blocker is retained rather than
  treated as parity sign-off.

## Odoo comparison

- `odoo-browser.json` records desktop and mobile attempts at
  `http://127.0.0.1:8069/web/login` using `admin/admin`.
- `odoo-desktop.png` and `odoo-mobile.png` show the local login response. The
  credential was rejected (`Wrong login/password`, followed by Odoo's rate
  limit message), so authenticated Employee comparison was unavailable.
