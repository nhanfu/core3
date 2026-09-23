# `TIMESHEET-MY-BILLED-FIXED-PRICE-FILTER-001`

Bounded Timesheets slice for the Sales Timesheet `Billed at a Fixed Price`
filter on the authenticated My Timesheets action.

- Odoo reference: `http://localhost:8069`, database `core3_reference`.
- Core3 contracts: `services/timesheets/pages/entries.yaml` and
  `services/timesheets/api/entries.yaml`, joined by `page.id: timesheets`.
- Focused test: 4 tests / 21 expectations.
- No migration was needed; the durable billing column already existed.
- This is not Timesheets module sign-off. The remaining four Sales Timesheet
  billing filters and Core3 visual comparison remain open.

See `source-comparison.md`, `browser-check.md`, `test-results.md`, and
`runtime-blockers.md`.
