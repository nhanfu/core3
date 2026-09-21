# Runtime evidence and blockers

Date: 2026-09-21
Feature: `TIMESHEET-TASK-ACTION-PIVOT-VIEW-001`

## Browser capability

The session does not expose the Playwright `js_repl` capability, so no
authenticated screenshots were fabricated. Bounded HTTP probes are the
available runtime evidence.

## Core3

Desktop and mobile Core3 capture were blocked because the runtime was not
listening:

- `http://127.0.0.1:3001/api/modules` -> connection refused, HTTP 000
- `http://127.0.0.1:3001/task-timesheets` -> connection refused, HTTP 000

## Odoo comparison

Both paired task routes reached the unauthenticated login boundary:

- `http://127.0.0.1:8069/odoo/all-tasks/100` -> HTTP 200,
  `/web/login?redirect=%2Fodoo%2Fall-tasks%2F100%3F`
- `http://127.0.0.1:8073/odoo/all-tasks/100` -> HTTP 200,
  `/web/login?redirect=%2Fodoo%2Fall-tasks%2F100%3F`

Authenticated desktop/mobile comparison and visual parity sign-off are blocked.
Known Odoo Print/PDF/action-surface blockers remain open separately.
