# Test results

- `bun test ./test/purchase_order_reminder.integration.test.ts --timeout 30000`:
  **PASS**, 4 tests, 23 assertions.
- Purchase regression files for orders, acknowledgement, print, RFQ email,
  and Send PO: **PASS**, 29 tests, 235 assertions.
- `bun run audit`: **PASS**, 807 pages, 816 routes, 1671 datasources.
- `bun run frontend:build`: **PASS**.
- `git diff --check`: **PASS**.

The focused test verifies fresh migration, page/API binding, deterministic
preview content/history, unchanged order state/version, disabled/stale/missing
and invalid-actor rejection, and file-backed restart plus migration replay.
