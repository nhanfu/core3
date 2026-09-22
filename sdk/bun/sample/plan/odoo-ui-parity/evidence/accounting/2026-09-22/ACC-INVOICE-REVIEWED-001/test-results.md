# Test results

Command, run from `sdk/bun/sample`:

```text
bun test ./test/accounting_invoice_reviewed.integration.test.ts --timeout 20000
```

Result: **3 passed, 0 failed, 24 assertions**.

Coverage includes page/API `page.id` separation, Odoo source/action mapping,
permission metadata, posted-only and unchecked-only guards, missing/stale and
duplicate rejection, atomic row-version increment, and file-backed DuckDB
restart with idempotent migration replay.
