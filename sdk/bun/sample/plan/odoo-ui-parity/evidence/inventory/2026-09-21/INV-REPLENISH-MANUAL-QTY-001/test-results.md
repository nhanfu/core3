# INV-REPLENISH-MANUAL-QTY-001 evidence

- Focused integration: `bun test test/inventory_replenishment_manual_quantity.integration.test.ts test/inventory_replenishment.integration.test.ts` — 7 tests, 55 assertions passed.
- Coverage includes Odoo source mapping, page/API separation and discovery, deterministic manual-override fixtures, reset persistence, manager permission denial, actor/company/stale/state guards, and restart reads.
- Core3 browser: bounded desktop 1440x900 and mobile 390x844 probes reached only `/auth/login`; captures are explicitly non-authenticated. No page errors or 5xx responses were observed.
- Odoo runtime: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; paired authenticated comparison is blocked.
