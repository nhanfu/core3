# `TIMESHEET-ALL-NON-BILLABLE-FILTER-001`

## Source and Core3 contract

Odoo's `sale_timesheet` search inheritance adds the authenticated All Timesheets
`non_billable` filter over `timesheet_invoice_type = non_billable`. Core3 maps
that action through the existing durable `timesheet_entries.billing_type`
relation (falling back to the persisted billable flag when the relation is
empty). The page declares the Non-Billable filter and the API applies the same
company-scoped predicate under `page.id: all-timesheets`.

## Authenticated Odoo evidence

- `odoo-desktop.png`: 1440x900 authenticated All Timesheets search panel with
  Non-Billable selected; the result list renders `1-80 / 387`.
- `odoo-mobile.png`: 390x844 authenticated responsive All Timesheets Kanban
  state; no page errors were recorded.
- `odoo-results.json`: exact excerpts, viewport, selected-filter count, and
  page/request errors (`[]`).

## Core3 evidence and blockers

Core3 desktop/mobile authenticated capture is blocked before route discovery by
the shared page-schema error recorded in `core3-readiness.txt`:
`components[0].header_actions[6].id references unknown action "edit_employee_type"`.
This is outside Timesheets ownership and was not changed.

Odoo Print/PDF/report-action surfaces remain broader parity blockers; this
filter slice does not claim report or module sign-off.
