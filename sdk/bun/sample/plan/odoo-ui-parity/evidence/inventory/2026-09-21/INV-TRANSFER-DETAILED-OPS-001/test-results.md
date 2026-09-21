# INV-TRANSFER-DETAILED-OPS-001 verification

- `bun test test/inventory_transfer_detailed_operations.integration.test.ts`: 4 tests / 28 assertions passed.
- `bun test test/inventory_transfer_workflow.integration.test.ts test/inventory_transfer_print.integration.test.ts`: 8 tests / 85 assertions passed.
- `bun run audit`: passed — 725 pages, 734 routes, 1,407 datasources.
- Scoped browser evidence: authenticated Core3 admin at desktop 1440x900 and mobile 390x844; both rendered the transfer-scoped operation, had HTTP 200 page responses, no page errors, no HTTP >=400 responses, and no horizontal overflow.
- `git diff --check`: pending final commit verification.

The paired Odoo probe is recorded in `odoo-blocker.json`; Odoo redirected to `/web/login` before authentication.
