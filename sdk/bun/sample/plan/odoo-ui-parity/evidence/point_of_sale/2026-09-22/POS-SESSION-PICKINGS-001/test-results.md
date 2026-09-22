# Test results

- Focused: `bun test ./test/pos_session_pickings.integration.test.ts
  --timeout 30000` — 3 passed, 18 assertions.
- Related regression: session Orders, session Payments, order Pickings, and
  actor/company boundary suites — 20 passed, 166 assertions.
- UI audit: `bun run audit` — 842 pages, 850 routes, 1,755 datasources;
  passed.
- Frontend: `bun run frontend:build` — passed.
- POS CSS: `bun run css:build:point-of-sale` — passed.
- Hygiene: `git diff --check` — passed.

The feature has no new migration because it projects the existing durable
`pos_order_pickings` relation. Focused tests reapply all POS migrations and
reopen a file-backed database.
