# Test results

- `bun test ./test/purchase_order_send_po.integration.test.ts --timeout 30000`:
  **PASS**, 4 tests, 27 assertions, 0 failures.
- `bun test ./test/purchase_order_email.integration.test.ts ./test/purchase_order_print.integration.test.ts ./test/purchase.integration.test.ts --timeout 30000`:
  **PASS**, all reported tests passed, 0 failures.
- `bun run audit`: **PASS**, 805 pages, 814 routes, 1664 datasources.
- `bun run frontend:build`: **PASS**.
- `git diff --check`: **PASS**.
