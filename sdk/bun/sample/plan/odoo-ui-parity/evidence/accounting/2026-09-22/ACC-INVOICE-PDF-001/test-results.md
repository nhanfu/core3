# Test results

Command, run from `sdk/bun/sample`:

```text
bun test test/accounting_invoice_pdf_download.integration.test.ts
```

Result:

```text
2 pass, 0 fail, 16 expect() calls
```

Coverage includes:

- page/API `invoice-detail` binding and `accounting.read` action metadata;
- `application/pdf`, deterministic filename, and `%PDF-1.4` bytes;
- missing/vendor/forbidden route boundaries;
- persistence after DuckDB close/reopen and idempotent migrations.
