# Odoo analysis

Source: `/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml`
and `/home/nhanjs/projects/odoo/addons/maintenance/models/maintenance.py`, Odoo
19 revision `65975996`.

- Action `maintenance_request_action_reports` is `/odoo/maintenance-requests-analysis`.
- Its view order is `graph,pivot,kanban,list,form,calendar,activity` and its
  context applies `search_default_active`.
- The Graph view groups by `user_id` and `stage_id` and exposes `duration` as
  the measure, with hidden `color` and `repeat_interval` measures.
- The Pivot view exposes `user_id`, `stage_id`, and hidden `color`; the live
  Measures menu showed Duration, Repeat Every, and Count.
- The request model computes `duration` as scheduled-end minus scheduled-start
  in hours and defaults the scheduled end to one hour after the scheduled date.

Authenticated BrowserSkill observation used browser instance `245ea108`,
database `core3_reference`, and the existing Odoo session at
`http://localhost:8069`. Desktop Graph and Pivot were observed; mobile at a
390x844 emulated viewport selected Odoo’s Kanban fallback. Captures are the
three PNGs in this folder.
