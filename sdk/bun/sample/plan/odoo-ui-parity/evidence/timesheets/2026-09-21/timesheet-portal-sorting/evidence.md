# `TIMESHEET-PORTAL-SORTING`

Captured 2026-09-21 with authenticated headless Chromium at 1440x900 and
390x844.

## Odoo comparison

- Authenticated `/my/timesheets` exposes Newest, Employee, Project, Task,
  Description, Sales Order Item, and Invoice sort links.
- `odoo-desktop-portal.png` and `odoo-mobile-portal.png` capture the initial
  source states.
- `odoo-desktop-project-sort.png` and `odoo-mobile-project-sort.png` capture
  `/my/timesheets?sortby=project_id`; both render the sorted portal table.
- Page errors were empty. Mobile background asset requests aborted after the
  route rendered and are recorded in `results.json`.

## Core3 status

The Core3 Timesheets agent could not start because global page discovery hit an
unowned Ecommerce YAML boundary:
`SyntaxError: YAML Parse error: Unexpected token`. A focused discovery scan
identified the stale `components[1].search.lots` and
`components[1].search.or packages...` shapes. No Core3 screenshot is claimed
or fabricated.

The slice supports the five sort keys backed by the owned durable portal
projection. Odoo's Sales Order Item and Invoice sort keys are recorded as
source blockers because their persisted projection is not owned by Timesheets.
The existing Print/PDF/action blockers remain open; this evidence is not
module sign-off.
