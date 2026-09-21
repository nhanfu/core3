# INV-QUANT-REPLENISHMENT-001 evidence

- Focused integration: `bun test test/inventory_quant_replenishment.integration.test.ts` — 4 tests, 37 assertions passed.
- Coverage includes Odoo source mapping, page/API discovery and separation, deterministic orderpoint/run fixtures, search/empty/transport states, actor/company/stale guards, file-backed restart persistence, and `inventory.manage` permission denial.
- Core3 browser: bounded desktop/mobile probe reached the sign-in shell only; captures are explicitly non-authenticated.
- Odoo runtime: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; paired authenticated comparison is blocked.
