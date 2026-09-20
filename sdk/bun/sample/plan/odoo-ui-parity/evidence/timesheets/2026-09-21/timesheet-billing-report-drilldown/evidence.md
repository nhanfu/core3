# `TIMESHEET-REPORT-BILLING-DRILLDOWN` evidence

Captured 2026-09-21. The implementation and database-focused verification are
Timesheets-owned; the shared browser runtime was not repaired across module
ownership boundaries.

## Odoo comparison

- Authenticated `codex@core3.local` reached
  `/odoo/timesheets-billing` at `1440x900` and `390x844`.
- The Billing Type report rendered at both viewports without horizontal
  overflow. No loaded row-to-entry form action was visible; paired Odoo row
  execution is therefore an exact blocker rather than a parity claim.
- Desktop recorded one unrelated aborted avatar request; mobile recorded no
  failed requests. See `results.json` for machine-readable values.

## Core3 blocker

- The authenticated Core3 module runner could not render `/auth/login` because
  discovery fails first on the concurrent non-Timesheets page
  `services/surveys/pages/surveys.yaml`, `actions[4].fields is not allowed`.
- The same shared discovery boundary also contains the pre-existing invalid
  `services/accounting/pages/invoices.yaml` action shape, but the runner stops
  at Surveys first. This owner did not alter or stage either file.
- The Core3 screenshots and `results.json` preserve the failed runtime state;
  no Core3 parity claim is made. Focused repository tests provide the
  page/API, durable restart, permission, and company/empty guard evidence.
