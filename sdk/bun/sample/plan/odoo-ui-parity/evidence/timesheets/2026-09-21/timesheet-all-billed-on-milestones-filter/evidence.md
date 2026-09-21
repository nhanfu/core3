# `TIMESHEET-ALL-BILLED-ON-MILESTONES-FILTER-001`

## Source and Core3 contract

Odoo's `sale_timesheet` search inheritance adds the authenticated All
Timesheets `billable_milestones` filter labelled **Billed on Milestones**, over
`timesheet_invoice_type = billable_milestones`. Core3 maps that action through
the existing durable `timesheet_entries.billing_type` relation. The page
declares the one filter and the API records its explicit durable filter
contract and pivot billing type under `page.id: all-timesheets`.

## Authenticated Odoo evidence

- `odoo-desktop.png`: 1440x900 authenticated All Timesheets search panel with
  Billed on Milestones selected; the result list renders `1-13 / 13`.
- `odoo-mobile.png`: 390x844 authenticated responsive All Timesheets Kanban
  state; no page errors were recorded.
- `odoo-results.json`: exact excerpts, viewport, selected-filter count, and
  page/request errors (`[]`).

## Core3 evidence and blockers

Core3 desktop/mobile authenticated capture is blocked before authentication:
the bounded startup exits 124 because backend `127.0.0.1:3001` does not expose
`/api/modules` within 18 seconds. The exact output and endpoint result are in
`core3-readiness.txt`.

Odoo Print/PDF/report-action surfaces remain broader parity blockers; this
filter slice does not claim report or module sign-off.
