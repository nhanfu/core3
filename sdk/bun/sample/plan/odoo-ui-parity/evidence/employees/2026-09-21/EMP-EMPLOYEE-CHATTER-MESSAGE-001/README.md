# EMP-EMPLOYEE-CHATTER-MESSAGE-001 evidence

Feature: normal Employee chatter Send message, distinct from internal notes,
followers, and ad-hoc Schedule activity. Odoo source comparison is anchored to
`/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py:40`, where
`hr.employee` inherits `mail.thread.main.attachment`, and
`/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml:413`, where
the Employee form renders `<chatter reload_on_follower="True"/>`.

## Core3

- `core3-browser.json` and the paired desktop/mobile PNGs record attempts
  against `/employees/detail?id=employee-demo-001`.
- Core3 startup was blocked before route discovery by an unrelated shared
  Inventory contract: `services/inventory/pages/transfer-detail.yaml` reports
  `components[0].stat_buttons[2].id references unknown action
  "view_inventory_transfer_traceability"`. Both viewports therefore record
  `ERR_CONNECTION_REFUSED`; the Employees implementation was not changed to
  bypass another module's invalid contract.

## Odoo comparison

- `odoo-browser.json` records desktop and mobile attempts at
  `http://127.0.0.1:8069/web/login` using `admin/admin`.
- `odoo-desktop.png` and `odoo-mobile.png` show the local login responses:
  `Wrong login/password`, followed by Odoo's rate-limit message. Authenticated
  Employee comparison was unavailable.
