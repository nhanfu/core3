# Test results

- `bun test ./test/accounting_invoice_pay_now.integration.test.ts --timeout 20000` — **3 passed, 18 assertions, 0 failures**.
- Coverage includes source/action mapping, page/API separation, durable pending transaction creation, duplicate/stale/invalid guards, and DuckDB restart persistence.
- The test also confirms the invoice remains open with its original residual after a pending request.
- `bun test ./test/accounting*.integration.test.ts --timeout 20000` — **111 passed, 1,220 assertions, 0 failures** across 42 files.
- `bun run audit` — **passed**, 811 pages, 820 routes, 1,689 datasources.
- `bun run frontend:build` — **passed**, including the Accounting Sass/Vite build.
- `git diff --check` — **passed**.
