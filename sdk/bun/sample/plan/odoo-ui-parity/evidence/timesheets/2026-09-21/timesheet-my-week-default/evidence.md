# `TIMESHEET-MY-WEEK-DEFAULT-001` evidence

- Odoo source: `addons/hr_timesheet/views/hr_timesheet_views.xml` defines the
  authenticated `act_hr_timesheet_line` action at `/odoo/timesheets` with
  `search_default_week`, `is_timesheet`, and `is_my_timesheets` context.
- Odoo desktop: authenticated `codex@core3.local` rendered `My Timesheets` at
  1440x900 with the source list and Time Spent values. The capture is
  `odoo-desktop.png`.
- Odoo mobile: the same authenticated action resolved to the responsive
  `?view_type=kanban` state at 390x844 and rendered the compact timesheet cards.
  The capture is `odoo-mobile.png`.
- Core3 desktop and mobile authenticated captures render `/timesheets` with
  `Date: This Week` at 1440x900 and 390x844. Core3 reports no page errors and
  no horizontal overflow; `results.json` records only aborted background
  prefetches for the unrelated All Timesheets surfaces.
- Existing Timesheets Print/PDF/action blockers remain open; this is not module
  sign-off.
