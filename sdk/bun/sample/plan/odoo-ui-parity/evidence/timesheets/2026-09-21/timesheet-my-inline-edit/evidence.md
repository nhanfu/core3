# `TIMESHEET-MY-INLINE-EDIT-001` evidence

Captured 2026-09-21 from the authenticated Timesheets owner slice.

- Core3 desktop: `core3-desktop.png` authenticates as `admin@tms.local`, opens
  `/timesheets?work_date=this_week&view=list&form=hidden`, clicks the first
  durable row, and shows the inline editable-top row with `Save` and
  `Discard`. The browser recorded no page errors or failed requests.
- Core3 mobile: `core3-mobile.png` authenticates as the same user at 390x844.
  The responsive action defaults to Calendar and renders the current-week
  entries without page errors; the desktop-only list view is not exposed at
  this viewport, so inline editing is not claimed for mobile.
- Odoo desktop: `odoo-desktop.png` authenticates as
  `codex@core3.local` and opens `/odoo/timesheets`, where the source list
  renders Date, Project, Task, Description, Sales Order Item, and Time Spent.
- Odoo mobile: `odoo-mobile.png` authenticates as the same reference user and
  resolves to `/odoo/timesheets?view_type=kanban`, showing the responsive
  Timesheets cards. Odoo's native editable list is a desktop/list state, so
  no mobile inline-edit parity is claimed.
- `results.json` records viewport, route, clicked-row, inline-editor/save
  counts, rendered text, and browser errors for all four captures.

The source contract is `hr_timesheet/views/hr_timesheet_views.xml`, where
`hr_timesheet_line_tree` declares `editable="top"`; the source also uses the
`timesheet_uom` widget and project/task relation selectors. Core3's new
page/API pair preserves durable actor/company/relation state and optimistic
row-version guards. Odoo Print/PDF/report-action surfaces remain broader
module blockers and this slice does not claim Timesheets sign-off.
