# Test results

- `bun test test/manufacturing_bom_operations_performance.integration.test.ts --timeout 30000`
  — **4 tests / 27 assertions passed**.
- Coverage includes Odoo source modes/domain/stat button, page/API discovery
  and route binding, BoM scoping, Done-only rows, filters, empty/503 states,
  permission declarations, migration replay/index idempotence, and restart
  persistence.
- Browser visual comparison remains blocked by the shared Odoo profile; this
  file does not claim UI sign-off.
