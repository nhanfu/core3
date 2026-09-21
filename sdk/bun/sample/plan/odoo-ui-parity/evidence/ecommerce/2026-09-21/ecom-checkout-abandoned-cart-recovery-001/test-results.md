# Test results

Focused implementation test:

```text
bun test test/ecommerce_abandoned_cart_recovery.integration.test.ts
3 pass
0 fail
42 expect() calls
```

Adjacent regression:

```text
bun test test/ecommerce_abandoned_carts.integration.test.ts test/ecommerce_checkout.integration.test.ts
14 pass
0 fail
75 expect() calls
```

The focused test covers Odoo source/menu/settings comparison, page/API schema
validation, migrations replayed twice, policy CRUD, company and validation
guards, disabled-policy behavior, idempotent recovery send, stale concurrency,
and restart persistence.

Scoped verification:

```text
bunx eslint test/ecommerce_abandoned_cart_recovery.integration.test.ts -> passed
bun run audit -> UI audit passed: 731 pages, 740 routes, 1424 datasources
git diff --check -> passed
```
