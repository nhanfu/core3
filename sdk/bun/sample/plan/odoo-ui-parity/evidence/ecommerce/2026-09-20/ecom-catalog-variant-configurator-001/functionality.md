# Functional evidence

Focused command:

```text
bun test ./test/ecommerce_variant_configurator.integration.test.ts \
  ./test/ecommerce_cart.integration.test.ts \
  ./test/ecommerce_product_variants.integration.test.ts --timeout 20000
```

Result: 9 tests, 57 assertions, 0 failures.

The focused suite proves page/API `page.id` separation; authenticated variant
cart mutation permission and company/active/published validation; anonymous
variant selection; quantity increment idempotency; migration replay; and
DuckDB restart persistence of variant identity, name, price, and quantity.
