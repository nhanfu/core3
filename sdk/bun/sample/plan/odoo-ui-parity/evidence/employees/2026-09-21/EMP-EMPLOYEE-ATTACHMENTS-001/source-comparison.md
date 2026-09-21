# EMP-EMPLOYEE-ATTACHMENTS-001 source comparison

Odoo source:

- `addons/hr/models/hr_employee.py:40` inherits
  `mail.thread.main.attachment` on `hr.employee`.
- `addons/hr/views/hr_employee_views.xml:413` renders the Employee form
  `<chatter reload_on_follower="True"/>`.

Core3 mapping:

- `migrations/20260922170000-071-employee-attachments.yaml` owns durable
  attachment metadata/content and the deterministic fixture.
- `services/employees/api/employee-detail.yaml` owns the scoped datasource and
  guarded upload/download/remove actions.
- `services/employees/pages/employee-detail.yaml` owns only the Attachments
  panel bindings and action IDs; it contains no persistence logic.

The authenticated Odoo comparison is blocked by the available local credential
being rejected. Core3 desktop/mobile rendering is captured, with the fixture
company mismatch documented in `verification.md`.
