# Test results

Focused command:

```text
bun test test/manufacturing_production_planning.integration.test.ts --timeout 20000
```

Result: 4 tests / 27 assertions passed. The suite covers source/action
mapping, scoped/default and error queries, file-backed restart, idempotent
migration, and workflow/permission boundaries.
