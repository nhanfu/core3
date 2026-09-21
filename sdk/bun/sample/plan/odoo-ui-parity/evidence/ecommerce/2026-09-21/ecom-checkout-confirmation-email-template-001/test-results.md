# Test results

Focused implementation test:

```text
bun test test/ecommerce_checkout_confirmation_email.integration.test.ts
3 pass
0 fail
32 expect() calls
```

Adjacent checkout and Orders regression:

```text
bun test test/ecommerce_checkout.integration.test.ts test/ecommerce_orders.integration.test.ts
14 pass
0 fail
79 expect() calls
```

The focused test covers source comparison, page/API schema validation,
migrations replayed twice, active template options, company scope, invalid
template validation, optimistic concurrency, authenticated and guest checkout
snapshots, and restart persistence.
