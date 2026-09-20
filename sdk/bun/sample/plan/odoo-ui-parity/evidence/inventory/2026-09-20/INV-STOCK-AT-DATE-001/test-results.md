# Test results

- `bun test test/inventory_stock_report.integration.test.ts --timeout 20000` — 4 passed, 0 failed, 50 assertions.
- Coverage includes page/API ownership, seeded context, report filtering,
  idempotent migration, invalid-date and company guards, unauthorized page
  access, and file-backed restart persistence.
- Fresh Core3 browser evidence: desktop and mobile API responses were 200 with
  no failed requests; both restored 10 rows after selecting `2026-01-16`.
- Full Inventory regression: `bun test ./test/inventory*.integration.test.ts
  --timeout 20000` — 59 passed, 0 failed, 586 assertions across 18 files.
- `bun run audit` — passed (671 pages, 680 routes, 1216 datasources).
- `bun run css:build:inventory` — passed.
- `bunx eslint test/inventory_stock_report.integration.test.ts` — passed.
- `git diff --check` — passed.
- Odoo comparison: authenticated desktop/mobile report navigation had no
  failed requests; desktop opened the wizard and mobile did not expose the
  control at 390px.

Static audit, CSS, lint, and diff checks are recorded after the final code pass
in the owner report and QA ledger.
