# INV-STOCK-FORECAST-001 blockers

- Authenticated Core3 desktop/mobile evidence is complete in `browser.json`
  and the six PNG captures here. The isolated runtime was
  `http://127.0.0.1:4317`; browser records contain no failed requests/page
  errors and report no horizontal overflow at 1440px or 390px.
- Odoo `127.0.0.1:8069` was reachable and the documented
  `codex@core3.local` credentials authenticated to Discuss. In the bounded
  evidence attempt, authenticated `/odoo/stock-report` did not complete its
  client render within the Playwright network-idle window, so no paired Odoo
  Forecasted Report screenshot or mutation was captured.
- This is an evidence blocker, not a Core3 test failure. No Odoo data was
  changed and no parity sign-off is claimed. A future pass should capture the
  Stock row and product `View Availability` client action in authenticated
  Odoo before closing the comparison gate.
