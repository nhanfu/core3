# Odoo analysis

Local source revision: `659759969d535d286b656c96b675e4612b925ddd`.

Relevant source:

- `addons/hr_holidays/models/hr_leave.py:129-135` defines states `confirm`
  (To Approve), `validate1` (Second Approval), `validate` (Approved), plus
  Refused and Cancelled.
- `addons/hr_holidays/models/hr_leave.py:1149-1164` implements
  `action_approve`: a two-step type moves to `validate1` and records first
  approval; a final validation moves to `validate`.
- `addons/hr_holidays/models/hr_leave.py:1237-1262` implements final
  `_action_validate`, including balance validation and second approver.
- `addons/hr_holidays/models/hr_leave.py:1396-1415` defines manager and
  officer transition permissions for first and second approval.
- `addons/hr_holidays/models/hr_leave_type.py:83-87` defines the `both`
  validation type, “By Employee's Approver and Time Off Officer”.
- `addons/hr_holidays/views/hr_leave_views.xml:336-342` renders Approve,
  Validate, Refuse, Cancel, and the two-step statusbar.

Live authenticated reference check used BrowserSkill instance `245ea108` and
the authenticated `core3_reference` session. The Time Off app was absent from
the application menu; the visible menu contained Discuss, Calendar, Contacts,
CRM, Sales, Invoicing, Project, Timesheets, Events, Surveys, Purchase,
Inventory, Maintenance, Employees, Expenses, and Apps, but no Time Off.
Authenticated direct navigation to `/odoo/time-off-approval?db=core3_reference`
resolved to the Discuss shell. No Odoo mutation or credential/token access was
performed.
