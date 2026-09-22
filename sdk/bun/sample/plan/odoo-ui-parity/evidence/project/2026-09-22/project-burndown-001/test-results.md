# Test results

- `bun test ./test/project_burndown.integration.test.ts --timeout 30000` —
  2 passed, 0 failed, 18 assertions.
- The focused test covers page/API separation, route discovery, action wiring,
  persisted project context, deterministic seven-row chart data, empty and
  not-found branches, and stable forbidden/transport errors.
- `bun run audit` — passed: 836 pages, 844 routes, 1,745 datasources.
- No migration was needed: the report reads the durable Project tables and
  uses no generated timestamps or browser fixtures.
