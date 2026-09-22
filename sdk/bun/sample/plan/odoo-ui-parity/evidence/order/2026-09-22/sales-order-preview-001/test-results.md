# Test results

## Focused

`bun test test/sales_order_preview.integration.test.ts --timeout 30000`

- 2 tests passed
- 18 assertions
- 0 failures

Coverage includes Odoo source/view mapping, page/API binding, Preview and Back
actions, read-only sources, populated order/line data, missing and out-of-scope
reads, idempotent migration replay, and file-backed reopen.

## Audit

`bun run scripts/audit-order-ui.ts`

- 813 pages
- 822 routes
- 1,694 datasources
- UI audit passed

## Regression note

The Sales order detail regression was run with the existing focused Sales tests;
the pre-existing exact header-label assertion required the new source-backed
`Preview` label and was updated in the module-owned test.
