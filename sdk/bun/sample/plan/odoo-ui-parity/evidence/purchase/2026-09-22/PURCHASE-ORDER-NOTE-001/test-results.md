# Test results — `PURCHASE-ORDER-NOTE-001`

- Focused: `bun test ./test/purchase_order_notes.integration.test.ts --timeout 30000` — **PASS**, 4 tests / 21 assertions.
- Coverage includes page/API binding, create/edit/delete persistence, seeded
  `line_note`, zero-total behavior, invalid/stale/locked/non-note guards,
  migration replay, and file-backed restart.
- Related section/order-line regression: `bun test
  ./test/purchase_order_notes.integration.test.ts
  ./test/purchase_order_sections.integration.test.ts
  ./test/purchase_order_lines.integration.test.ts --timeout 30000` — **PASS**,
  11 tests / 74 assertions.
- Full Purchase regression: `bun test ./test/purchase*.integration.test.ts
  --timeout 30000` — **PASS**, 94 tests / 785 assertions.
- UI audit: `bun run audit` — **PASS**, 840 pages / 848 routes / 1,750
  datasources.
- Purchase Sass: `bun run css:build:purchase` — **PASS**.
- Frontend build: `bun run frontend:build` — **PASS**, 184 modules transformed.
- `git diff --check` — **PASS**.
- BrowserSkill live Odoo/Core3 desktop/mobile evidence — **BLOCKED**; no visual
  parity claim.
