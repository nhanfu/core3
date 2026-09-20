# Verification

- `bun test ./test/inventory_product_categories.integration.test.ts --timeout 20000`
  — pass, 4 tests / 39 assertions.
- Coverage includes direct page/API contract validation, deterministic hierarchy
  and descendant counts, category-filtered product drilldown, manager CRUD,
  duplicate/parent/cycle/in-use guards, permission boundary, row versions,
  and file-backed restart persistence.
- Authenticated Core3 browser capture: desktop and mobile list/detail states,
  HTTP 200 page/source requests, no page errors, and no horizontal overflow.
- Scoped Inventory contract audit — pass through the focused test's direct
  `validatePageDefinition` checks for both page/API pairs.
- `bunx eslint test/inventory_product_categories.integration.test.ts` and
  scoped `git diff --check` — pass.
- Repository `bun run audit` — blocked by the pre-existing Employees schema
  error recorded in `blockers.md`.
