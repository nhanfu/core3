# Functional evidence

Focused command:

```text
bun test ./test/ecommerce_payment_providers.integration.test.ts \
  ./test/ecommerce_payment_methods.integration.test.ts \
  ./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000
```

Result: 10 tests, 65 assertions, 0 failures.

Coverage includes menu/page/API separation, deterministic provider fixtures,
company-scoped reads and writes, duplicate/code/state/feature/amount
validation, optimistic edit/disable/restore, migration replay, and DuckDB
restart persistence.
