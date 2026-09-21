# Test results

Focused implementation test:

```text
bun test test/ecommerce_checkout_tax_display_mode.integration.test.ts
3 pass
0 fail
30 expect() calls
```

The test covers source comparison, page/API schema validation, migrations
replayed twice, CRUD and projections, wrong-company scope, invalid selection,
optimistic concurrency, public cart operation, and restart persistence.

Adjacent cart/checkout regression, scoped audit, ESLint, and diff-check results
are recorded after the final local verification run and must be read together
with the commit report; this file intentionally does not claim full-repository
sign-off.
