# Verification results

Run from `sdk/bun/sample` on 2026-09-21:

- `bun test test/ecommerce_checkout_account_policy.integration.test.ts
  --timeout 20000` — **3 passed, 27 assertions, 0 failures**.
- `bun test test/ecommerce_checkout.integration.test.ts
  test/ecommerce_shop.integration.test.ts
  test/ecommerce_product_detail.integration.test.ts --timeout 20000` —
  **20 passed, 119 assertions, 0 failures**.
- `bun run audit` — **721 pages, 730 routes, 1396 datasources**, audit passed.
- `bunx eslint test/ecommerce_checkout_account_policy.integration.test.ts` —
  passed with no warnings/errors.
- `git diff --check` — passed.

The focused integration suite covers source/menu/page/API pairing, migration
replay, deterministic policy read, invalid mode, company boundary, optimistic
stale write, mandatory anonymous checkout rejection, optional guest checkout,
and file-backed restart persistence.
