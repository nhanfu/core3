# Test results

Passed:

- `bun test test/fleet_model_vehicles_action.integration.test.ts --timeout 30000` — 2 passed, 18 assertions.
- `bun test test/fleet_models.integration.test.ts test/fleet_vehicles_visual.integration.test.ts test/fleet_model_vehicles_action.integration.test.ts --timeout 30000` — 6 passed, 76 assertions.

The focused test covers source mapping, page/API discovery, read permission,
model-scoped rows, migration replay, company isolation, empty state, unknown
model empty state, and transport error behavior.
