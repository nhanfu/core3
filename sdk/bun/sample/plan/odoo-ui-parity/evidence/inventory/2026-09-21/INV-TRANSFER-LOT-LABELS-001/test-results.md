# INV-TRANSFER-LOT-LABELS-001 verification

- Focused Lot/SN suite: `bun test test/inventory_transfer_lot_labels.integration.test.ts` — PASS, 4 tests / 27 assertions.
- Product Labels regression: `bun test test/inventory_transfer_labels.integration.test.ts` — PASS, 4 tests / 23 assertions.
- Related transfer regression: `bun test test/inventory_transfer_lot_labels.integration.test.ts test/inventory_transfer_labels.integration.test.ts test/inventory_transfer_print.integration.test.ts test/inventory_transfer_workflow.integration.test.ts` — PASS, 16 tests / 135 assertions.
- Browser: authenticated Core3 desktop 1440x900 and mobile 390x844; Lot/SN form values and saved `lots` / `4X12` history present, `bad_responses` and `page_errors` empty.
- Odoo: live authenticated comparison blocked by HTTP 303 to `/web/login?redirect=%2Fweb%3F`; see `odoo-blocker.json`.
