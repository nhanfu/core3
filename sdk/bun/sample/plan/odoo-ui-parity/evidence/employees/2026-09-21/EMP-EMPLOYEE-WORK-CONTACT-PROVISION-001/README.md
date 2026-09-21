# EMP-EMPLOYEE-WORK-CONTACT-PROVISION-001 evidence

Date: 2026-09-21

This slice covers Odoo Employee work-contact provisioning. Odoo's
`_inverse_work_contact_details` copies work email/phone to the linked contact
and calls `_create_work_contacts` when no work contact exists. The prior
related-contact slice only assigned or cleared an existing relation.

Source comparison:

- `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py:799-842`
  contains `_create_work_contacts`, `_compute_work_contact_details`, and
  `_inverse_work_contact_details`.
- `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml:126-138`
  renders Employee Work Email and Work Phone.
- Core3 API owns `create_employee_work_contact`; Core3 page YAML owns the
  Create Work Contact binding, joined by `page.id`.

Artifacts:

- `core3-browser.json`, `core3-desktop.png`, `core3-mobile.png`
- `odoo-browser.json`, `odoo-desktop.png`, `odoo-mobile.png`

Core3 authenticated desktop and mobile captures used isolated ports 3301/3302.
Both reached the Employee route with no request failures, console errors, or
horizontal overflow. The deterministic Employee belongs to Core3 Vietnam,
while the authenticated session is Core3 Demo Company, so its provisionable
work-contact values and Create Work Contact control were not rendered. Odoo
comparison was attempted at both viewports; `admin/admin` was rejected and
the second attempt was rate-limited. These are explicit browser blockers, not
an aggregate Employees sign-off.
