# `TIMESHEET-MY-ANALYSIS-VIEWS`

Captured 2026-09-21 with authenticated headless Chromium at desktop 1440x900
and mobile 390x844.

## Core3

- `/timesheets` authenticated successfully.
- Desktop list, Pivot, and Graph render the seeded personal rows; Pivot shows
  weekly Date rows with Time Spent and Timesheet Costs, and Graph shows project
  series over work dates.
- Mobile uses the responsive Calendar/Kanban surface and correctly hides the
  desktop-only Pivot/Graph tabs. Body and document widths are both 390px.
- `core3-desktop-list.png`, `core3-desktop-pivot.png`,
  `core3-desktop-graph.png`, and `core3-mobile-list.png` are the rendered
  states. `results.json` records the one aborted detail prefetch and no page
  errors.

## Odoo comparison

- Authenticated `/odoo/timesheets` rendered the personal action.
- Desktop exposes and renders List, Calendar, Kanban, Pivot, and Graph; the
  paired Pivot/Graph captures are `odoo-desktop-pivot.png` and
  `odoo-desktop-graph.png`.
- Mobile loads Odoo's responsive `?view_type=kanban` state and hides Pivot and
  Graph, matching the Core3 mobile visibility decision.
- `odoo-desktop.png` and `odoo-mobile.png` capture the initial paired states;
  background/prefetch aborts are listed in `results.json`, with no page errors
  or horizontal overflow.

The broader Odoo Print/PDF/action gaps documented by earlier Timesheets slices
remain blockers. This evidence is for the analysis-view feature only and is
not module sign-off.
