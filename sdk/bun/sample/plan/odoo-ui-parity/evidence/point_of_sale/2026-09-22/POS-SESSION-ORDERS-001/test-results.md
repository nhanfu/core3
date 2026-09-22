# Test results

- Focused: `bun test ./test/pos_session_orders.integration.test.ts --timeout
  30000` — 4 passed, 23 assertions.
- Related regression: `bun test ./test/pos_session_payments.integration.test.ts
  ./test/pos_order_pickings.integration.test.ts ./test/pos_order_delete.integration.test.ts
  ./test/pos_order_refund_links.integration.test.ts --timeout 30000` — 11
  passed, 71 assertions.
- UI audit: `bun run audit` — 837 pages, 845 routes, 1,747 datasources;
  passed.
- Frontend: `bun run frontend:build` — passed.
- POS CSS: `bun run css:build:point-of-sale` — passed.
- Hygiene: `git diff --check` — passed.

The implementation uses existing schema/data migrations; no new migration file
was needed. Focused tests reapply migrations and reopen a file-backed database.
