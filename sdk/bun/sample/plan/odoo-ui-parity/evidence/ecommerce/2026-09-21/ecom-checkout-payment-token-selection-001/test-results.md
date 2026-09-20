# Test results

- `bun test ./test/ecommerce_checkout_payment_token.integration.test.ts
  ./test/ecommerce_checkout.integration.test.ts
  ./test/ecommerce_payment_tokens.integration.test.ts
  ./test/ecommerce_payment_transactions.integration.test.ts --timeout 20000`
  — **23 passed, 134 assertions, 0 failures**.
- `bunx eslint test/ecommerce_checkout_payment_token.integration.test.ts` —
  **passed**.
- `git diff --check` — **passed**.
- `bun scripts/audit-order-ui.ts` — **passed**, 692 pages, 701 routes, 1290
  datasources.
- Full repository regression was not run; unrelated owner scopes remain
  outside this bounded verification.
