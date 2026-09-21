# Odoo analysis

Local source: `/home/nhanjs/projects/odoo/addons/hr_holidays` at the revision
recorded in the Time Off sub-plan.

- `views/hr_leave_allocation_views.xml:518-534` defines
  `hr_leave_allocation_view_activity`, titled `Allocation Requests`; activity
  cards show employee, number of days, and Time Off Type.
- `views/hr_leave_allocation_views.xml:537-550` defines
  `hr_leave_allocation_action_my` as `list,kanban,form,activity`, scoped to the
  current user's employee and current year, with the empty help text
  `Create a new allocation request` and its follow-up sentence.
- The activity view is therefore a distinct visible mode of My Allocations,
  not the already-covered Overview calendar or accrual-plan surfaces.

Authenticated reference attempt used browser instance `245ea108`, URL
`http://localhost:8069`, database `core3_reference`, and the existing local QA
login session. Navigating `/odoo/my-time-off?db=core3_reference` resolved to
the Discuss/OdooBot shell. The opened app menu contained Discuss, Calendar,
To-do, Contacts, CRM, Sales, Dashboards, Point of Sale, Invoicing, Project,
Timesheets, Events, Surveys, Purchase, Inventory, Maintenance, Employees,
Expenses, and Apps, with no Time Off entry. No Odoo data was changed.
