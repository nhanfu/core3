# Test results

Command:

```text
bun test ./test/pos_order_refund_links.integration.test.ts --timeout 30000
```

Result: 3 tests passed, 0 failed, 24 assertions.

Coverage includes source/action mapping and separate page/API IDs;
`Refunds`/`Refunded Orders` read-only navigation metadata; filtered related
order projection, search, state, missing-source, and wrong-company boundaries;
source/refund detail projections; and idempotent migration replay with
file-backed close/reopen persistence.

Scoped checks also passed:

- `bun run audit` — 797 pages, 806 routes, 1,644 datasources;
- `bun run frontend:build` — completed successfully;
- `git diff --check` — clean for the feature changes.
