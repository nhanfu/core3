# Test results — `PURCHASE-ORDER-SECTION-001`

- Focused: `bun test ./test/purchase_order_sections.integration.test.ts ./test/purchase_order_lines.integration.test.ts --timeout 30000` — **PASS**, 7 tests / 53 assertions.
- Coverage includes page/API binding, create/edit/delete persistence, seeded display line, invalid/stale/locked/non-section guards, migration replay, and existing product-line regression.
- UI audit: `bun run audit` — **PASS**, 834 pages / 842 routes / 1,740 datasources.
- `bun run audit:yaml` — **UNAVAILABLE**; the active package has no script with that name.
- Full Purchase regression: `bun test ./test/purchase*.integration.test.ts --timeout 30000` — **PASS**, 90 tests / 764 assertions.
- Purchase Sass: `bun run css:build:purchase` — **PASS**.
- Frontend/CSS build: `bun run frontend:build` — **PASS**, 184 modules transformed.
- Targeted ESLint for the changed tests and shared LineItemGrid — **PASS**.
- `git diff --check` — **PASS**.
