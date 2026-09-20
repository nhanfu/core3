# Test results

## Focused bounded tests

Command:

```text
bun test ./test/inventory_scrap_orders.integration.test.ts --test-name-pattern='returns deterministic|guards create|enforces read/write' --timeout 30000
```

Result: **3 passed, 0 failed, 24 assertions** for the non-discovery workflow
subset; the complete file later passed at **4 passed, 0 failed, 36
assertions**.

Coverage includes deterministic list/detail/error states, Product Move fixture
relations, create/edit/duplicate/required/stale guards, Draft → Done
validation, duplicate/done transition protection, move persistence after
restart, and runtime read/write permission denial.

## Repository discovery boundary and final module verification

An initial complete-file command was blocked before Inventory discovery by
unrelated in-progress Ecommerce/Employees/Surveys API edits:

```text
PageSchemaError: Invalid page definition:
- actions[0].action is not allowed
- actions[0].refresh is not allowed
```

Inventory did not modify or stage those paths. After their boundary was
repaired, the final commands passed:

```text
bun test ./test/inventory*.integration.test.ts --timeout 30000
60 pass, 0 fail, 614 assertions across 18 files
bun run audit
UI audit passed: every discovered page uses supported shared components and has a route.
bun run css:build:inventory
bunx eslint test/inventory_scrap_orders.integration.test.ts
git diff --check
```
