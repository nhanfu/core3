# Test results

Focused command:

```text
bun test ./test/inventory_operation_types.integration.test.ts --timeout 20000
3 pass, 0 fail, 41 expect() calls
```

The test covers page/API separation and source labels, deterministic active and
archived fixtures, runtime page/action permission denial, create/edit/archive/
restore mutations, duplicate/invalid/required/open-transfer/stale guards,
idempotent migrations, and file-backed restart persistence.
