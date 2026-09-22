# Test results

Focused command:

```text
bun test ./test/pos_order_detail_email.integration.test.ts --timeout 30000
```

Result: 4 tests passed, 0 failed, 25 assertions.

Coverage includes Odoo source/action mapping, page/API IDs, detail projection,
visibility and prefill metadata, durable queue/operation creation, company
scope, stale/actor/recipient/content guards, and file-backed restart with
idempotent migration replay.

Regression command:

```text
bun test ./test/pos_order_email.integration.test.ts ./test/pos_order_detail_email.integration.test.ts ./test/point_of_sale.integration.test.ts ./test/pos_order_delete.integration.test.ts ./test/pos_order_pickings.integration.test.ts ./test/pos_order_refund_links.integration.test.ts ./test/pos_order_invoice_smart_button.integration.test.ts --timeout 30000
```

Result: 31 tests passed, 0 failed, 185 assertions.

Scoped gates:

- `bun run audit` — passed: 811 pages, 820 routes, 1,689 datasources.
- `bun run css:build:point-of-sale` — passed.
- `bun run frontend:build` — passed, including all CSS builds and Vite.
- Targeted ESLint — passed without warnings.
- `git diff --check` — passed for the feature changes.
