# Test results

Focused command:

```text
bun test test/ecommerce_order_assignment.integration.test.ts --timeout 20000
3 pass, 0 fail, 40 expect() calls
```

The suite covers Odoo source/menu/settings/model comparison, page/API pairing,
YAML schema validation, deterministic fixtures, company and permission
contracts, invalid values, stale writes, authenticated and guest checkout,
Sales handoff propagation, idempotent retry rejection, migration replay, and
DuckDB restart persistence.

Bounded regression:

```text
bun test test/ecommerce_order_assignment.integration.test.ts \
  test/ecommerce_checkout.integration.test.ts \
  test/ecommerce_orders.integration.test.ts --timeout 20000
17 pass, 0 fail, 119 expect() calls
```

Additional checks:

- `bunx eslint test/ecommerce_order_assignment.integration.test.ts` passed.
- `bun run audit` passed: 733 pages, 742 routes, 1434 datasources.
- `git diff --check` passed.
