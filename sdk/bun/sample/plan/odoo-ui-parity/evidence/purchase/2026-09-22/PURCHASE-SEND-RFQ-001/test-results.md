# Test results

- `bun test ./test/purchase_order_email.integration.test.ts --timeout 30000`: 4 passed, 28 assertions, 0 failed.
- Purchase regression suite (`purchase.integration`, `purchase_order_lines`,
  `purchase_order_print`, `purchase_create_bills`, and
  `purchase_acknowledgement`): 28 passed, 238 assertions, 0 failed.
- `bun run audit`: passed; 789 pages, 798 routes, 1626 datasources.
- `bun run frontend:build`: passed.
- `git diff --check`: passed before final documentation-only updates; rerun at handoff.
- `bun run audit:yaml`: unavailable because no such package script exists.
