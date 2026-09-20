# Test results

Focused command:

```text
bun test ./test/inventory_physical_inventory.integration.test.ts --timeout 30000
4 pass, 0 fail, 39 assertions
```

Full Inventory regression:

```text
bun test ./test/inventory*.integration.test.ts --timeout 30000
61 pass, 0 fail, 627 assertions
```

The focused tests cover YAML ownership, deterministic fixtures, Apply All
validation and counted-only updates, move-history side effects, runtime
permission denial, and file-backed restart persistence.
