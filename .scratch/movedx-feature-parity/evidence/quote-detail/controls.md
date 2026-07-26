# Quote detail controls

## Local interaction checklist

- [x] The list `Chi tiết` action carries the quote ID through the SPA hash.
- [x] Header identity, status, customer, validity, currency, and notes load
  from the selected quote.
- [x] Draft quotes expose add, edit, and delete line controls; non-Draft quotes
  hide mutation controls.
- [x] A normal add form refreshes sale value, cost, profit, line grid, and
  activity timeline in place.
- [x] The server derives sell total, cost total, quote amount, and profit from
  line values.
- [x] Update/delete are parent-scoped, Draft-only named actions and write audit
  events in the same transaction.
- [x] Forged header totals and direct raw-line patches are rejected.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow; the tablet grid
  owns horizontal scrolling.
- [x] Browser console and response checks are clean after authenticated load.

## Local evidence

- `local-desktop.png`: Draft quote with line economics, derived money summary,
  and activity timeline.
- `local-tablet.png`: the same state at 1024 x 768 with contained grid
  scrolling.
