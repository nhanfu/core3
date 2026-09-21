# INV-TRANSFER-NEXT-001 verification

- Focused feature: `bun test test/inventory_transfer_next.integration.test.ts` — PASS, 4 tests / 31 assertions.
- Related transfer regression: `bun test test/inventory_transfer_next.integration.test.ts test/inventory_transfer_workflow.integration.test.ts test/inventory_transfer_print.integration.test.ts test/inventory_transfer_detailed_operations.integration.test.ts` — PASS, 16 tests / 144 assertions.
- YAML/UI audit: `bun run audit` — PASS, 726 pages / 735 routes / 1,409 datasources.
- Scoped lint: `bunx eslint test/inventory_transfer_next.integration.test.ts` — PASS.
- Whitespace validation: `git diff --check` — PASS.
- Browser: authenticated Core3 desktop 1440x900 and mobile 390x844; expected source/next transfer labels present, `bad_responses` and `page_errors` empty.
- Odoo: live authenticated comparison blocked by HTTP 303 to `/web/login?redirect=%2Fweb%3F`; see `odoo-blocker.json`.
