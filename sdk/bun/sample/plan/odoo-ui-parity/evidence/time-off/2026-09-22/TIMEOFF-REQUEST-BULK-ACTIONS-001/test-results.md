# Test results

- `bun test ./test/time_off_request_bulk_actions.integration.test.ts --timeout 30000` — **3 passed, 0 failed, 14 assertions**.
- `bun test ./test/time_off*.integration.test.ts --timeout 30000` — **85 passed, 0 failed, 806 assertions** across 31 Time Off integration files.
- The focused suite uses DuckDB and exercises durable request, balance, and approval-audit mutations with deterministic guard errors.
