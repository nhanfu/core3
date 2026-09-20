# INV-PRODUCT-TEMPLATES-001 verification

- `bun test test/inventory_product_templates.integration.test.ts` — PASS, 4 tests / 42 assertions.
- `bun run audit` from `sdk/bun/sample` — PASS, 718 pages / 727 routes / 1,375 datasources.
- `bunx eslint test/inventory_product_templates.integration.test.ts` — PASS.
- `git diff --check` — PASS before commit.
- Focused checks cover page/API separation, deterministic templates and
  variant aggregates, manager CRUD, company/type/tracking/number guards,
  variant deletion protection, reader/manage permissions, row versions,
  migration replay, and file-backed restart persistence.
