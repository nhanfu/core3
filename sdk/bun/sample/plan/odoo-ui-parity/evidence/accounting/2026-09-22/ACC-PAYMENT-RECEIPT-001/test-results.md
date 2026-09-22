# Test results

Focused command:

```text
bun test test/accounting_payment_receipt.integration.test.ts --timeout 20000
```

The suite covers Odoo source/action mapping, page/API `page.id` binding,
permission/action declarations, valid queue insertion, email/content guards,
missing/stale rejection, atomicity, and file-backed restart/migration replay.
Result: **3 passed, 29 assertions, 0 failures**.

Regression result: `bun test test/accounting_*.integration.test.ts --timeout
20000` — **122 passed, 1,323 assertions, 0 failures** across 46 files.
