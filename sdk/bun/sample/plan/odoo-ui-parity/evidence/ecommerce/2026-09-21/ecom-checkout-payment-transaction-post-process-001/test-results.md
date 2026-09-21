# Verification results

- Focused: `bun test test/ecommerce_payment_transaction_post_process.integration.test.ts`
  — **3 passed, 29 assertions, 0 failures**.
- Regression: `bun test test/ecommerce_payment_transaction_post_process.integration.test.ts test/ecommerce_payment_transactions.integration.test.ts test/ecommerce_checkout.integration.test.ts test/ecommerce_checkout_payment_token.integration.test.ts`
  — **22 passed, 136 assertions, 0 failures**.
- Scoped YAML audit: Payment Transactions API, merged page/API definition,
  and Checkout API validated with `validatePageDefinition` — **passed**.
- Repository UI audit: `bun run audit` — **726 pages, 735 routes, 1409
  datasources; passed**.
- Scoped lint: `bunx eslint test/ecommerce_payment_transaction_post_process.integration.test.ts`
  — **passed**.
- Diff check: `git diff --check` — **passed**.
