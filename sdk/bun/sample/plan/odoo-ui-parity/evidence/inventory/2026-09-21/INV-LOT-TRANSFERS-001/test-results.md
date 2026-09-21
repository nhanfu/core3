# INV-LOT-TRANSFERS-001 verification

- Source comparison: PASS. Odoo `stock.lot.action_lot_open_transfers` is mapped from the Lot form stat button and outgoing delivery move semantics.
- Focused feature suite: PASS — `bun test test/inventory_lot_transfers.integration.test.ts`, 4 tests / 30 assertions.
- Adjacent regression suite: PASS — lot transfers, lots, lot locations, and lot traceability integration files, 15 tests / 128 assertions.
- Coverage: page/API separation and discovery, deterministic outgoing transfer fixture, search/empty/transport states, durable request history, current company, actor, stale row-version, migration replay, restart persistence, and tracking permission boundary.
- Core3 browser: BLOCKED for this wave. The probe reached the login shell and captured desktop/mobile login-shell images, but did not complete the authenticated redirect before it was stopped; no authenticated visual pass is claimed. The exact attempt and captures are in `core3-browser.json`.
- Odoo browser: BLOCKED with HTTP 303 to `/web/login?redirect=%2Fweb%3F`; exact response is in `odoo-blocker.json`.
