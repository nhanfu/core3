# Test results

Command:

```text
bun test test/sales_order_print.integration.test.ts --timeout 120000
```

Result: **4 passed, 0 failed, 25 assertions**.

Covered cases: source/page/API mapping; quotation and cancelled-order PDF run
metadata; unchanged order status/version; missing, wrong-scope, confirmed,
blank-actor, and stale guards; no partial rows; migration replay; and
file-backed restart persistence.
