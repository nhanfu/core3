# Test results

Focused command:

    bun test test/fleet_model_vehicle_create.integration.test.ts
    3 pass, 0 fail, 28 expect() calls

Model regression command:

    bun test test/fleet_model_vehicle_create.integration.test.ts test/fleet_model_vehicles_action.integration.test.ts test/fleet_models.integration.test.ts test/fleet_model_vendors.integration.test.ts
    12 pass, 0 fail, 128 expect() calls

Additional checks:

    bun run audit
    UI audit: 853 pages, 861 routes, 1799 datasources
    git diff --check: passed
