# Browser evidence and blockers

Browser skill session was started on browser instance `245ea108` and used only
for this POS reference check. Credentials, cookies, and tokens were not
printed or extracted.

## Authenticated Odoo reference

Service: `http://localhost:8069`, database `core3_reference`.

Desktop at the Orders route showed four orders. Selecting one row displayed
`1 selected` and the `Create Invoices` bulk action. Opening it displayed the
`Create Invoice(s)` dialog with `Order Count` equal to `1`, plus `Create` and
`Cancel`; the consolidated-billing control is hidden for a single order.
Capture: `/tmp/odoo-pos-bulk-invoice-desktop.png`.

At the iPhone-14 emulation (390x844), the Orders surface showed four order
cards. Selection checkboxes and the `Create Invoices` bulk action were not
exposed in the mobile view, matching the documented Odoo responsive behavior
for this list action.
Capture: `/tmp/odoo-pos-bulk-invoice-mobile.png`.

## Core3 blocker

The isolated Core3 runtime was started from `sdk/bun/sample` with DuckDB
memory mode. Its frontend became reachable, but the backend repeatedly failed
to become ready during the full module migration/startup window; the observed
requests returned 502 for `/api/modules`, `/api/apps`, `/api/auth/me`, and
`/api/pages/dashboard?lc=en`. A later isolated authenticated probe reached the
frontend but had no reusable QA session and returned 401 for the protected
dashboard before the POS page could render. Therefore there is no honest Core3
desktop/mobile screenshot, click-through, or successful browser mutation claim
for this batch.

The bsk session was stopped after the evidence attempt.
