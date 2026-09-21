# Functionality evidence

Command:

```text
bun test ./test/pos_order_bulk_invoice.integration.test.ts --timeout 30000
```

Result: 4 tests passed, 0 failed, 22 assertions.

Assertions cover:

- separate page/API contracts joined by `page.id: pos-orders`;
- Odoo list-header label and wizard field source mapping;
- `pos.write` action declaration;
- two same-customer paid/to-invoice orders becoming one durable invoice;
- non-consolidated selection becoming two invoices;
- missing, cross-company, already invoiced, and not-ready selections rejected
  with no durable run;
- migration replay after closing/reopening DuckDB preserves the invoice run,
  invoice count, order state, and invoice link.
