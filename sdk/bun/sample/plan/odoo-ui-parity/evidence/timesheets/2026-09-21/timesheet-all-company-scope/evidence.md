# `TIMESHEET-ALL-COMPANY-SCOPE`

Captured 2026-09-21 with authenticated headless Chromium at 1440x900 and
390x844.

## Core3

- `core3-desktop.png` and `core3-mobile.png` render authenticated
  `/timesheets/all-timesheets` as `admin@tms.local` / `admin123`.
- Both routes show the durable 15-row All Timesheets fixture, with no page
  errors or failed requests. Reported body and document widths are 1440 and
  390 respectively.
- The browser session proves route/render access only; company isolation is
  proved by the repository tests because the single authenticated browser
  company has no visible company-switch state in this bounded route.

## Odoo comparison

- `odoo-desktop.png` and `odoo-mobile.png` render authenticated
  `/odoo/all-timesheets` as `codex@core3.local` in the installed reference.
- Odoo exposes the All Timesheets list at desktop and its responsive kanban at
  mobile. The analytic multi-company rule is sourced from
  `addons/analytic/security/analytic_security.xml` and restricts analytic
  lines to `company_ids`; the Timesheets approver rule is in
  `addons/hr_timesheet/security/hr_timesheet_security.xml`.
- Odoo page errors were empty. The shared `/mail/data` prefetch aborted during
  capture and is recorded in `results.json`; it did not prevent the route from
  rendering.

## Blockers

- Core3 mobile visually clips the wide list columns at 390px even though page
  scroll metrics remain 390px; this is a responsive shared-list limitation and
  is not claimed as fixed by this data-scope slice.
- The browser does not expose a company switch, so visual cross-company
  switching is not claimed; durable company isolation and explicit company
  switching are covered by focused repository tests.
- Existing Timesheets Print/PDF/action and broader route comparison blockers
  remain open. This evidence is not module sign-off.
