# Test results

Focused:

```text
bun test test/sales_order_discount.integration.test.ts --timeout 120000
3 pass, 0 fail, 18 expect() calls
```

Scoped regression:

```text
bun test test/sales_order_detail.integration.test.ts test/sales_order_display_lines.integration.test.ts test/sales_quotation_templates.integration.test.ts test/sales_quotation_email.integration.test.ts test/sales_order_discount.integration.test.ts --timeout 120000
17 pass, 0 fail, 128 expect() calls
```

The scoped regression includes the display-lines test because the new
Discount action shares its `LineItemGrid` action list. `git diff --check` is
required before commit. Repository-wide Order sign-off remains out of scope.
