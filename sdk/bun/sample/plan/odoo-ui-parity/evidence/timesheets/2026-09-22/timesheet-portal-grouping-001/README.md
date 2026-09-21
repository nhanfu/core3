# Timesheets portal grouping — `TIMESHEET-PORTAL-GROUPING-001`

Date: 2026-09-22

This bounded slice implements the Odoo `/my/timesheets` group-by contract in
the existing Core3 page/API pair. It adds the missing Parent Task grouping,
projects durable parent-task values into the portal API, normalizes empty
parents to `No Parent Task`, and declares the five supported group contracts.

The authenticated Odoo reference was checked at
`http://localhost:8069/my/timesheets?db=core3_reference` with `groupby=project_id`
and `groupby=parent_task_id` on desktop and `groupby=parent_task_id` on an
iPhone 14 emulation. The PNGs in this directory are Odoo reference captures;
Core3 captures are not claimed because the module runtime failed discovery
before opening a port.

Source-backed implementation:

- `services/timesheets/pages/portal-timesheets.yaml`
- `services/timesheets/api/portal-timesheets.yaml`
- `test/timesheets_portal_grouping.integration.test.ts`
