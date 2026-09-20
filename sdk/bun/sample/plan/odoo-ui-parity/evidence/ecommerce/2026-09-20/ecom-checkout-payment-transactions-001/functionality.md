# Functional evidence

Focused command:

```text
bun test ./test/ecommerce_payment_transactions.integration.test.ts \
  ./test/ecommerce_checkout.integration.test.ts \
  ./test/ecommerce_payment_methods.integration.test.ts --timeout 20000
```

Result: 19 tests, 114 assertions, 0 failures.

Coverage includes page/API/menu separation, deterministic transaction fixture,
authenticated checkout creation, unique order/idempotency replay behavior,
pending→authorized→done transitions, invalid state and missing provider
reference validation, wrong-company and stale-row rejection, migration replay,
and DuckDB restart persistence.
