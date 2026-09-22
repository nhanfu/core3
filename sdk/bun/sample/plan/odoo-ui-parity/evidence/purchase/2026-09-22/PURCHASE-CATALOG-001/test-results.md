# Test results — `PURCHASE-CATALOG-001`

- Focused: `bun test ./test/purchase_order_catalog.integration.test.ts ./test/purchase_order_lines.integration.test.ts --timeout 30000` — **PASS**, 5 tests / 49 assertions.
- Full Purchase regression: `bun test ./test/purchase*.integration.test.ts --timeout 30000` — **PASS**, 86 tests / 743 assertions.
- UI audit: `bun run audit` — **PASS**, 824 pages / 832 routes / 1,714 datasources.
- Purchase Sass: `bun run css:build:purchase` — **PASS**.
- Frontend/CSS build: `bun run frontend:build` — **PASS**, Vite transformed 184 modules and built in 753ms.
- `git diff --check` — **PASS**.

The focused suite covers page/API joining, options-source binding, new lines,
repeat selection merge, total/version persistence, stale replay, non-editable
orders, missing product, and empty selection.
