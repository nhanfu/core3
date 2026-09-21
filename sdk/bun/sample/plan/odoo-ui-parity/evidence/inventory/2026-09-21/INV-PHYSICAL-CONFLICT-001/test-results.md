# INV-PHYSICAL-CONFLICT-001 verification

- `bun test test/inventory_physical_conflicts.integration.test.ts test/inventory_physical_inventory.integration.test.ts test/inventory_physical_reset.integration.test.ts test/inventory_request_count.integration.test.ts --timeout 20000`
  - PASS: 16 tests, 108 assertions.
  - Covers both conflict decisions, deterministic fixtures, CRUD mutation,
    company/actor/missing/selection/decision/stale guards, restart persistence,
    and `inventory.write` permission denial.
- Core3 browser probe: PASS to login shell only; desktop 1440x900 and mobile
  390x844 captures have no request errors or horizontal overflow, but are not
  authenticated feature evidence.
- Odoo comparison: BLOCKED by HTTP 303 to `/web/login?redirect=%2Fweb%3F`.
