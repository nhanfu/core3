# Odoo analysis

Local source: `/home/nhanjs/projects/odoo/addons/hr_holidays/views/hr_leave_views.xml`.

- `hr_leave_action_my_request` is an `ir.actions.act_window` named `Time Off
  Request`, targets `hr.leave`, uses `view_mode=form`, and has `target=new`.
- `hr_leave_action_my_request_view_form` binds the action to
  `hr_leave_view_form_dashboard_new_time_off`.
- The dashboard form keeps the employee fixed for a normal employee and shows
  Time Off Type, dates, duration, description, and modal controls.

BrowserSkill instance `245ea108`, session `lvan`, borrowed authenticated tab
`1770663883`, and database `core3_reference` were used for the live gate.
`http://localhost:8069/odoo/time-off?db=core3_reference` resolved to Discuss,
with no Time Off menu or action. Desktop and mobile captures are outside Git:

- `/tmp/core3-odoo-parity/timeoff-dashboard-request-modal-odoo-discuss-desktop.png`
- `/tmp/core3-odoo-parity/timeoff-dashboard-request-modal-odoo-discuss-mobile.png`

No Odoo mutation or credential access occurred.
