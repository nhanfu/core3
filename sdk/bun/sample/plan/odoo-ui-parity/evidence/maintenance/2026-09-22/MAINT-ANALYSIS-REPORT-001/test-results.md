# Test results

- `bun test ./test/maintenance*.integration.test.ts --timeout 20000` — **46
  passed, 0 failed, 418 assertions** across 19 files.
- New `maintenance_analysis_reporting.integration.test.ts` — **3 passed, 0
  failed, 18 assertions**.
- `bun run audit` — passed: **808 pages, 817 routes, 1673 datasources**.
- `bunx eslint sample/test/maintenance_analysis_reporting.integration.test.ts`
  — passed.
- `bun run css:build:global && bun run css:build:maintenance` — passed.
- `git diff --check` — passed.
- Repository `bun run lint` remains blocked by four pre-existing unused-variable
  errors outside Maintenance: `accounting_invoice_reset_to_draft`,
  `blog_actor_boundary`, `inventory_product_replenishment`, and
  `purchase_order_email` tests.
