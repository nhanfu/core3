# Test results

- `bun test ./test/accounting_invoice_preview.integration.test.ts --timeout 20000` — **3 passed, 17 assertions, 0 failures**.
- Regression: `bun test ./test/accounting_invoice_preview.integration.test.ts ./test/accounting_invoice_pdf_download.integration.test.ts ./test/accounting_invoice_reset_to_draft.integration.test.ts --timeout 20000` — **7 passed, 51 assertions, 0 failures**.
- `bun run audit` — **passed**, 805 pages, 814 routes, 1,664 datasources.
- `bun run frontend:build` — completed successfully through the Accounting Sass/Vite build.
- `git diff --check` — passed.
- `/api/modules` on isolated Accounting runner `http://127.0.0.1:4013` — HTTP 200 and lists `/accounting/invoice-preview`.
