# Test results

- `bun test test/inventory_product_move_history.integration.test.ts --timeout 20000`: 3 tests, 21 assertions passed.
- Covered page/API ownership, stable action wiring, template-scoped rows, company and empty boundaries, read-only permission, idempotent migration, and file-backed restart persistence.
- The pre-existing `inventory_moves_history.integration.test.ts` baseline is currently affected by concurrent workspace changes: it sees 16 Done rows instead of its historical 13-row assertion. Global discovery is also blocked by unrelated concurrent POS page/action schema changes. No unrelated files were modified for this feature.
