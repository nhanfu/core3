# Test results

Focused command:

```text
bun test test/inventory_product_putaway.integration.test.ts --timeout 30000
```

Result: 3 tests passed, 19 assertions, 0 failures.

Coverage includes page/API ownership and action wiring for both product forms,
product-or-category filtering, empty/company guards, idempotent migration, and
file-backed restart persistence.

Additional gates:

- `bun run audit` — passed: 845 pages, 853 routes, 1767 datasources.
- `bun run css:build:inventory` — passed.
- `bun run frontend:build` — passed: Vite production build completed.
- Scoped ESLint for the changed Inventory tests — passed.
- `git diff --check` — passed.
