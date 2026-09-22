# Test results

- `bun test ./test/accounting_invoice_cancel.integration.test.ts --timeout 20000`
  — 2 passed, 22 assertions, 0 failures.
- The test covers source mapping, page/API separation, action visibility and
  params, durable Draft → Cancelled transition, row-version guard, invalid
  states, permission denial, and DuckDB restart persistence.
- An initial run exposed an invalid `updated_at` write against the existing
  invoice schema; the workflow was corrected to update only `state` and
  `row_version`, then the focused test passed.
- The invoice regression set completed 19/20 tests and 135 assertions; the
  one failure was the unrelated repository discovery error
  `Duplicate datasource id "inventory_reordering_rule_products"` in the
  concurrent dirty Inventory YAML. The full Accounting glob hit the same
  discovery blocker; those Inventory files were not changed.
