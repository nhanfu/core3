# ECOM-REPORT-ONLINE-SALES-ANALYSIS-001 verification

Command:

```text
bun test ./test/ecommerce_online_sales_analysis.integration.test.ts --timeout 30000
```

Result: **3 passed, 26 assertions, 0 failures**.

Assertions cover:

- separate page/API YAML joined by stable page ID and the eCommerce Reporting
  menu entry;
- Odoo Online Sales Analysis Graph/Pivot order, confirmed-order default,
  date range, search, group-by, pivot, graph, and empty-state contracts;
- durable checkout-backed confirmed order lines, product search, company/date
  filtering, empty fixture behavior, and 401/403/503 error declarations.

No migration was added because this read-only report consumes the existing
durable eCommerce checkout/order-line schema.
