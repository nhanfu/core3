# INV-TRANSFER-SPLIT-001 verification

- `bun test test/inventory_transfer_split.integration.test.ts --timeout 20000` — PASS, 4 tests / 30 assertions.
- Regression: `bun test test/inventory_transfer_split.integration.test.ts test/inventory_transfer_workflow.integration.test.ts test/inventory_transfer_backorders.integration.test.ts test/inventory_transfer_add_packs.integration.test.ts --timeout 20000` — PASS, 16 tests / 132 assertions.
- Core3 browser probe — desktop 1440x900 and mobile 390x844 reached `/auth/login`; no request failures and no horizontal overflow. See `core3-browser.json` and screenshots.
- Odoo probe — HTTP 303 to `/web/login`; see `odoo-blocker.json`.
