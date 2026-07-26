# Order detail controls

## Local interaction checklist

- [x] The list `Chi tiết` action carries the order ID through the SPA hash.
- [x] Header identity, status, customer, route, dates, currency, and notes load
  from the selected order.
- [x] Draft orders expose add, edit, and delete line controls; non-Draft orders
  hide mutation controls.
- [x] A normal add form creates a line and refreshes line, header total, and
  activity datasources in place.
- [x] The server derives quantity, tax, line total, and order total rather than
  accepting a writable header total.
- [x] Update/delete are parent-scoped, Draft-only named actions and write audit
  events in the same transaction.
- [x] Forged header totals and direct raw-line patches are rejected.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow; the tablet grid
  owns horizontal scrolling.
- [x] Browser console and response checks are clean after authenticated load.

## Local evidence

- `local-desktop.png`: Draft order with a newly added detail line, derived
  totals, and activity timeline.
- `local-tablet.png`: the same state at 1024 x 768 with contained grid
  scrolling.
