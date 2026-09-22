# Test results

- `bun test ./sample/test/manufacturing_production_workorders.integration.test.ts --timeout 20000`
  — PASS, 4 tests / 29 assertions.
- The suite covers source action identity, isolated discovery, all five view
  modes, MO scoping, filters, empty/not-found/503 states, migration replay,
  file-backed restart, permissions, workflow action metadata, and no
  create/delete actions.
