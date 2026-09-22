# Verification

Command:

```text
bun test test/sales_order_update_prices.integration.test.ts
```

Result: 3 tests passed, 19 assertions passed.

Coverage includes the page/API `page.id` binding and Odoo source mapping;
Wholesale Pricelist percentage pricing; discount reset; line tax and total
recalculation; durable order total and row-version updates; actor timeline
audit; and missing, branch-scope, confirmed-state, stale, inactive-pricelist,
and anonymous guards.
