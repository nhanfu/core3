# Odoo source analysis

- Addon: `/home/nhanjs/projects/odoo/addons/maintenance`, Odoo 19 revision
  `65975996`.
- Model: `maintenance.request` inherits `mail.thread.cc` and
  `mail.activity.mixin` in `models/maintenance.py`.
- Form: `views/maintenance_views.xml` contains `<chatter/>` on
  `hr_equipment_request_view_form`.
- Live route: `/odoo/maintenance-requests`; request detail was opened from the
  live kanban and showed `Send message`, `Log note`, `Activity`, message search,
  attachments, and the existing “Maintenance Request created” timeline entry.
- The bounded target is the internal-note branch of this Chatter surface. The
  live mobile capture shows the same `Log note` action and
  `Log an internal note…` composer without horizontal overflow.
