# EMP-EMPLOYEE-RELATED-CONTACTS-001 source comparison

Odoo source:

- `addons/hr/models/hr_employee.py:952-957` computes
  `related_partners_count`.
- `addons/hr/models/hr_employee.py:959-976` combines `work_contact_id` and
  `user_id.partner_id`, then returns a one-record form or multi-record
  kanban/list/form action.
- `addons/hr/views/hr_employee_views.xml:619-630` renders the Contacts stat
  button with `action_related_contacts`.

Core3 mapping:

- `migrations/20260922180000-072-employee-related-contacts.yaml` adds the
  durable employee relation and deterministic contact fixture.
- `services/employees/api/employee-detail.yaml` owns the scoped read/options,
  guarded set/clear mutation, and Contacts navigation action.
- `services/employees/pages/employee-detail.yaml` owns the stat button and
  Work Contact display/action bindings only.

The Odoo comparison is blocked by rejected local credentials. Core3 rendering
is blocked before authentication by the unrelated Surveys page-schema error.
