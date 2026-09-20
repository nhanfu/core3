# `TIMESHEET-ANALYSIS-DRILLDOWN` evidence

Captured 2026-09-21 against the authenticated local Core3 module runner and
the authenticated `core3_reference` Odoo instance.

## Core3

- Desktop `1440x900`: `/timesheet-analysis` rendered the persisted
  `Complete module migration` analysis row; clicking the row opened
  `/timesheets/detail?id=timesheet-demo-001&view_scope=all&report_scope=analysis`.
- Mobile `390x844`: the same row action opened the same durable detail route
  without horizontal overflow.
- Both captures were authenticated as `admin@tms.local`; the detail showed the
  persisted `Migration work` entry. There were no page errors or non-favicon
  failed requests.
- Screenshots and machine-readable measurements are in this directory;
  `results.json` is the source for viewport, URL, error, and overflow claims.

## Odoo comparison

- Authenticated `codex@core3.local` reached `/odoo/timesheets-by-employee` at
  both desktop and mobile viewports with no page errors or horizontal overflow.
- The aggregate By Employee report rendered, but the loaded state exposed no
  row-to-`timesheets.analysis.report` form action. Odoo's source form contract
  (`timesheets_analysis_report_form`) and action (`act_hr_timesheet_report`)
  are covered by the focused source comparison test, but their paired browser
  execution is blocked by the reference UI state.
- This is a blocker, not a parity or module sign-off claim.
