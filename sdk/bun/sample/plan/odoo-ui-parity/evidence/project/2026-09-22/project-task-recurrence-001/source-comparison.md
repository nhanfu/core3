# Source comparison

- Odoo source: `/home/nhanjs/projects/odoo/addons/project/models/project_task.py`
  and `project_task_recurrence.py` define recurrence membership, interval,
  unit, forever/until mode, end date, and recurrence lifecycle.
- Odoo view source: `/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml`
  defines the recurrence controls, Recurring Tasks stat button, and the
  `Tasks in Recurrence` action with list/form/kanban/calendar/pivot/graph/activity
  view modes.
- Live authenticated reference: Customer review showed Repeat Every `1`,
  Months, Until, an end date, and `1 Recurring Tasks`; the linked list title was
  `Tasks in Recurrence`.
- Core3 mapping: task-detail and recurrence page YAML are layout-only; matching
  API files own the datasource/actions; migration 019 owns durable state.
