# Test results

- `bun test ./test/accounting_invoice_attachments.integration.test.ts --timeout 20000`
  — **2 passed, 16 assertions, 0 failures**.
- Coverage includes page/API/storage binding, deterministic fixture, read-only
  upload denial, successful upload, parent row-version increment, duplicate and
  stale response guards, protected download bytes, and restart persistence.
- Full Accounting regression:
  `bun test ./test/accounting_*.integration.test.ts --timeout 20000` — **124
  passed, 1,339 assertions, 0 failures across 47 files**.
- `bun run audit` — **pass**, 845 pages, 853 routes, 1,767 datasources.
- `bun run frontend:build` — **pass**, including all CSS builds and Vite
  production output; no warnings were emitted.
- Targeted ESLint — **pass** for `sample/test/accounting_invoice_attachments.integration.test.ts`.
- `git diff --check` — **pass**.
