# Browser evidence

Browser automation used `bsk` with fresh observations and a dedicated session
that was stopped cleanly after capture.

## Odoo desktop

- Route: `http://localhost:8069/my/timesheets?db=core3_reference`
- Viewport: `1901x833`
- Fresh observation showed the authenticated `Codex QA 2` account and the
  Timesheets list with project, employee, task, description, invoice, and time
  spent columns.
- Capture: `odoo-desktop.png`

## Odoo mobile

- Same route and authenticated account.
- Device emulation: `iphone-14`, viewport `390x844`, touch/mobile UA.
- Fresh observation showed the responsive Timesheets table and `Toggle filters`
  control.
- Capture: `odoo-mobile.png`

## Core3 blocker

Core3 was not listening before the probe. A bounded `bun dev --db=ddb
--memory` startup attempt reached Vite but stopped on the shared page
discovery error `actions[7].fields must be a non-empty array`, so ports
`3001`/`3002` never became available. No Core3 screenshot or sign-off is
claimed.

Odoo Print/PDF/action surfaces are also not represented by these captures and
remain blockers.
