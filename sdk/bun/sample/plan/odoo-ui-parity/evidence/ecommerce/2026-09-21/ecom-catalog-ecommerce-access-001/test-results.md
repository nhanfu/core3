# Test results

Focused command:

```text
bun test test/ecommerce_access_policy.integration.test.ts --timeout 20000
3 pass, 0 fail, 38 expect() calls
```

Adjacent regression:

```text
bun test test/ecommerce_access_policy.integration.test.ts \
  test/ecommerce_shop.integration.test.ts \
  test/ecommerce_checkout.integration.test.ts --timeout 20000
18 pass, 0 fail, 129 expect() calls
```

Additional checks:

- `bunx eslint test/ecommerce_access_policy.integration.test.ts services/ecommerce/module.ts` passed.
- `bun run audit` passed: 735 pages, 744 routes, 1440 datasources.
- `git diff --check` passed.
