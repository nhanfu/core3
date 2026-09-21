# Browser verification

BrowserSkill was used through bsk on browser instance `245ea108` with the
authenticated Odoo `core3_reference` session.

Observed desktop reference:

- `/my/tasks/107?db=core3_reference` rendered task `Furniture Delivery` with
  `View Details`, a Timesheets table, and `Total Time Spent: 45:00`.
- `/my/tasks/107?db=core3_reference&report_type=html` rendered `Odoo Report`,
  heading `Timesheets for Furniture Delivery`, Date/Employee/Description/Time
  Spent, and `Total (Hours) 45:00`.

Core3 runtime readiness passed on `http://127.0.0.1:4012` through
`/api/modules`. Before authenticated Core3 navigation, the bsk session was
closed by the environment; the subsequent command returned:

```text
error: requested resource does not exist
details: session not registered or already stopped
```

Therefore no Core3 screenshot, Core3 authenticated action trace, mobile
capture, or visual parity sign-off is claimed. The local runner was stopped.
