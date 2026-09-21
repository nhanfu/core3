# Runtime evidence and blockers

Date: 2026-09-21
Feature: `TIMESHEET-TASK-ACTION-DISPLAY-NAME-001`

## Core3

Authenticated desktop and mobile browser captures were blocked. Bounded
probes returned connection refused for:

- `http://127.0.0.1:3001/api/modules`
- `http://127.0.0.1:3001/task-timesheets`

The Core3 runtime was not listening, so no screenshot or authenticated UI
claim is made. The page/API contract and durable task-context query are covered
by the focused integration suite.

## Odoo comparison

The paired route probes reached the Odoo login boundary rather than an
authenticated task action:

- `http://127.0.0.1:8069/odoo/task-timesheets` -> HTTP 200,
  `/web/login?redirect=%2Fodoo%2Ftask-timesheets%3F`
- `http://127.0.0.1:8073/odoo/task-timesheets` -> HTTP 200,
  `/web/login?redirect=%2Fodoo%2Ftask-timesheets%3F`

Authenticated Odoo desktop/mobile comparison is therefore blocked and no
visual parity sign-off is claimed. Odoo Print/PDF/action-surface blockers
remain open separately.
