# EMP-EMPLOYEE-ACTIVITY-FILTERS-001

This evidence covers Odoo's Employees activity filter IDs:
`filter_activities_my`, `activities_overdue`, `activities_today`, and
`activities_upcoming_all`.

## Browser verification

- Reference: `http://localhost:8069`, authenticated Odoo Employees action in
  the `core3_reference` environment.
- BrowserSkill reached `/odoo/employees`, rendered 24 records, and opened
  Activity View with 3 activity rows.
- Desktop: `odoo-desktop-activity-view.png` at 1916x833.
- Mobile: `odoo-mobile-activity-view.png` at 390x844 with touch emulation.
- No browser console or network failure was observed in this bounded flow.
- The available user tab was already borrowed by BrowserSkill session `goea`,
  so this run did not interrupt or re-borrow it. The task-owned authenticated
  tab was stopped after capture; no credential, cookie, or token was read.

Core3 runtime screenshots are not claimed for this slice.
