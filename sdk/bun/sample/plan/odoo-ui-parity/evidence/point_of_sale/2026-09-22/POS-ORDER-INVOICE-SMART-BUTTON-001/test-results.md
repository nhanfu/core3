# Test results

Focused command:

```text
bun test ./test/pos_order_invoice_smart_button.integration.test.ts --timeout 30000
```

Result: 3 tests passed, 0 failed, 18 assertions.

Coverage includes Odoo source/action mapping, separate page/API IDs, header
visibility metadata, linked invoice projection, current-company and missing
record boundaries, error-state declarations, migration replay, and file-backed
close/reopen persistence.

Regression commands also passed:

- `bun test ./test/pos_order_bulk_invoice.integration.test.ts --timeout 30000`
  — 3 tests passed.
- `bun test ./test/pos_order_delete.integration.test.ts --timeout 30000` — 2
  tests passed.
- `bun test ./test/pos_order_pickings.integration.test.ts --timeout 30000` — 3
  tests passed.
- `bun test ./test/pos_order_refund_links.integration.test.ts --timeout 30000`
  — 3 tests passed.
- `bun run audit` — 807 pages, 816 routes, 1,671 datasources.
- `bun run css:build:point-of-sale` — passed.
- Targeted ESLint on the new TypeScript test — passed with no warnings.
- `git diff --check` — clean.
