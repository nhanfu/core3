# Test results

- `bun test test/inventory_transfer_all_queue.integration.test.ts --timeout 30000`
  — 3 tests, 27 assertions passed.
- Covered source mapping, discovery, page/API separation, list modes, current
  company and operation filtering, search, state filter, empty/no-result,
  transport error, durable refresh, actor/scope/stale guards, and restart.
- The first run found and fixed one YAML schema issue: the comma-separated
  empty-state description needed quoting in flow-style YAML.
