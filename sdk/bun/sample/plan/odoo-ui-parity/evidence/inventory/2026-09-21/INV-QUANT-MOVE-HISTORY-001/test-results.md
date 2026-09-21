# INV-QUANT-MOVE-HISTORY-001 verification

- Focused Inventory suite (`inventory_quant_move_history`, `inventory_quant_relocation`, `inventory_moves_history`, `inventory_stock_locations`) — PASS, 15 tests / 127 assertions.
- `bunx eslint test/inventory_quant_move_history.integration.test.ts test/inventory_quant_relocation.integration.test.ts test/inventory_moves_history.integration.test.ts` — PASS.
- Isolated `bun run audit` — PASS, 732 pages / 741 routes / 1430 datasources.
- `git diff --check` — PASS for the owned implementation, tests, ledgers, and evidence.
- Authenticated Core3 browser probe — PASS, desktop 1440x900 and mobile 390x844; quant context, completed incoming/outgoing rows, empty browser error list, and no horizontal overflow.
- Odoo source comparison — PASS from the source files listed in `source-comparison.json`.
- Paired Odoo runtime — BLOCKED by HTTP 303 to `/web/login`; exact response is in `odoo-blocker.json`.
