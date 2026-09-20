# Reproducible verification

```text
bun test ./test/ecommerce_checkout_customer_address.integration.test.ts \
  ./test/ecommerce_checkout.integration.test.ts \
  ./test/ecommerce_checkout_payment_token.integration.test.ts \
  ./test/ecommerce_cart.integration.test.ts --timeout 20000
```

Result: **21 passed, 136 assertions, 0 failures**.

Commit gates:

```text
bun scripts/audit-order-ui.ts
bunx eslint test/ecommerce_checkout_customer_address.integration.test.ts
git diff --check
```

Audit result: **passed** — 694 pages, 703 routes, 1304 datasources. Scoped
ESLint and diff-check also passed. Runtime and Odoo route blockers are recorded
in `browser-check.md`.
