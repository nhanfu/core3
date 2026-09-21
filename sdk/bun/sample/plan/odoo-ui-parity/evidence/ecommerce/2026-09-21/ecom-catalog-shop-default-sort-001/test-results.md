# Verification results

Run from `sdk/bun/sample` on 2026-09-21:

- `bun test test/ecommerce_shop_default_sort.integration.test.ts
  --timeout 20000` — **3 passed, 29 assertions, 0 failures**.
- `bun test test/ecommerce_shop.integration.test.ts` — **3 passed, 25
  assertions, 0 failures**.
- Wave 20 paired page/API and Shop API YAML validation — passed.
- `bunx eslint test/ecommerce_shop_default_sort.integration.test.ts` — passed
  with no warnings/errors.
- `git diff --check` — passed.

The adjacent Products test and repository audit are blocked by the unrelated
existing `services/ecommerce/pages/products.yaml` schema error:
`components[1].title is not allowed`. That file was not changed in this slice.
