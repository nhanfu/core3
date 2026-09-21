# INV-OP-TYPE-MOVES-ANALYSIS-001 evidence

- Focused integration: `bun test test/inventory_operation_type_moves_analysis.integration.test.ts` — 4 tests, 34 assertions passed.
- Coverage includes Odoo source mapping, page/API discovery and separation, operation-type/company filtering, search/date/state/type/empty/transport states, durable report history, actor/company/stale guards, file-backed restart persistence, and `inventory.read` permission denial.
- Core3 browser: bounded desktop 1440x900 and mobile 390x844 probes reached the sign-in shell only; captures are explicitly non-authenticated.
- Odoo runtime: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; paired authenticated comparison is blocked.
