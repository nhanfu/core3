# `TIMESHEET-MY-INVOICE-GROUP-001`

Bounded parity evidence for the Odoo `sale_timesheet` Invoice group-by on the
internal My Timesheets action.

- Core3 page/API: `pages/entries.yaml` + `api/entries.yaml`, both bound to
  `page.id: timesheets`.
- Durable migration: `20260922110000-032-timesheets-my-invoice-group.yaml`
  (`version: 0.0.32`).
- Focused test: `test/timesheets_my_invoice_group.integration.test.ts`.
- Browser evidence and limitations: `browser-check.md`.
- No screenshots are claimed because BrowserSkill screenshot export hit the
  recorded session/device blockers.
