# `TIMESHEET-ALL-SALES-ORDER-SEARCH-001`

## Source and Core3 contract

Odoo's `sale_timesheet` search inheritance adds the authenticated All Timesheets
`order_id` field labelled **Sales Order**, with `ilike` matching over the sales
order and sales-order-line values. Core3 maps that action through the existing
durable `timesheet_entries.sales_order_item` column: the All Timesheets page
search placeholder names Sales Order and its paired `all_timesheet_entries`
query includes the persisted relation under the same `page.id:
all-timesheets` contract. The manager permission and current-company/empty
guards remain on the API source.

## Authenticated Odoo evidence

- `odoo-desktop.png`: 1440x900 authenticated All Timesheets search panel; the
  Sales Order field is filled with `S00035` and the result list is narrowed to
  `1-80 / 113`.
- `odoo-mobile.png`: 390x844 authenticated responsive All Timesheets Kanban
  state; no page errors were recorded.
- `odoo-results.json`: exact excerpts, viewport, selected-search count, and
  page/request errors (`[]`).

The live Odoo result confirms the visible Sales Order search action. The
fixture data differs from Core3's deterministic sample values, so the Core3
contract test uses the persisted `Core3 Implementation (Stakeholder review)`
relation.

## Core3 evidence and blockers

Core3 desktop/mobile authenticated capture is blocked before route discovery by
the shared page-schema error recorded in `core3-readiness.txt`:
`components[0].help is not allowed`. This is outside Timesheets ownership and
was not changed.

Odoo Print/PDF/report-action surfaces remain broader parity blockers; this
search slice does not claim report or module sign-off.
