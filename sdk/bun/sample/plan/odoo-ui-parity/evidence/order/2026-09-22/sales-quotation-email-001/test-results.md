# Test results

Focused command:

```text
bun test test/sales_quotation_email.integration.test.ts --timeout 30000
3 passed, 0 failures, 28 expect() calls
```

Assertions cover the source-backed composer/view mapping, page/API `page.id`
binding, explicit `orders.write` permission, durable send and actor timeline,
draft-to-sent transition, migration replay, stale/invalid/scope/missing guards,
atomic no-write rejection, and file-backed DuckDB reopen persistence.
