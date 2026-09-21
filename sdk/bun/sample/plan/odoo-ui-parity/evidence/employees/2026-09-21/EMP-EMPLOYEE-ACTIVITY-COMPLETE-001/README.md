# EMP-EMPLOYEE-ACTIVITY-COMPLETE-001 evidence

Date: 2026-09-21

This slice covers the source-backed Odoo Employee `mail.activity.mixin`
planned-activity Mark done workflow. The prior activity slice covers Schedule
activity creation; this slice covers the durable completion transition.

Source comparison:

- Odoo `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py` inherits
  `mail.activity.mixin`.
- Odoo `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`
  exposes `activity_ids` through the Employee chatter.
- Core3 API owns `complete_employee_activity`; Core3 page YAML owns the
  `OdooChatter` Mark done binding.

Verification artifacts:

- `core3-browser.json`, `core3-desktop.png`, `core3-mobile.png`
- `odoo-browser.json`, `odoo-desktop.png`, `odoo-mobile.png`

Core3 authentication succeeded at desktop and mobile viewports, and both
responsive captures were taken without request failures or horizontal
overflow. The deterministic `employee-demo-001` data was not visible to the
authenticated company session, so no Mark done control rendered; this is a
fixture/company alignment blocker, not a parity sign-off. Odoo comparison was
attempted at desktop and mobile, but `admin/admin` was rejected and the second
attempt was rate-limited. No aggregate Employees sign-off is claimed.
