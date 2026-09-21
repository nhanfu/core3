# Test results

Command, run from `sdk/bun/sample`:

```text
bun test test/accounting_invoice_print.integration.test.ts
```

Result:

```text
4 pass, 0 fail, 23 expect() calls
```

Assertions cover:

- page/API separation and matching `invoice-detail` IDs;
- `accounting.read` action metadata and Odoo report/source identity;
- durable print history, deterministic filename, actor, and refreshed query;
- missing, stale, vendor, and blank-actor guards with no partial write;
- DuckDB close/reopen persistence and idempotent migration replay.
