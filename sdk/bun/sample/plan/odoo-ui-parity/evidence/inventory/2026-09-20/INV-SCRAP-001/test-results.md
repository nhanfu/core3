# Test results

## Focused bounded tests

Command:

```text
bun test ./test/inventory_scrap_orders.integration.test.ts --test-name-pattern='returns deterministic|guards create|enforces read/write' --timeout 30000
```

Result: **3 passed, 0 failed, 24 assertions**.

Coverage includes deterministic list/detail/error states, Product Move fixture
relations, create/edit/duplicate/required/stale guards, Draft → Done
validation, duplicate/done transition protection, move persistence after
restart, and runtime read/write permission denial.

## Repository discovery boundary

The complete file command also runs the page/API discovery assertion. In this
shared checkout it is blocked before Inventory discovery by unrelated
in-progress Ecommerce/Employees/Surveys API edits:

```text
PageSchemaError: Invalid page definition:
- actions[0].action is not allowed
- actions[0].refresh is not allowed
```

Inventory did not modify or stage those paths. The bounded non-discovery tests
above pass. Full repository audit/lint remains conditional on that shared
boundary being repaired by its owners.
