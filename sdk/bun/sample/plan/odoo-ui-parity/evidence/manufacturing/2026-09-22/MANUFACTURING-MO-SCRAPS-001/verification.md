# Verification

- Focused: `bun test ./sample/test/manufacturing_production_scraps.integration.test.ts --timeout 20000` from `sdk/bun`: 3 tests, 26 assertions passed.
- Manufacturing audit: `bun run scripts/audit-order-ui.ts` from `sdk/bun/sample`: 836 pages, 844 routes, 1,745 datasources; passed.
- CSS: `bun run css:build:global && bun run css:build:manufacturing`: passed.
- Frontend: `bun run frontend:build`: passed, including Vite production build.
- ESLint: `bunx eslint sample/test/manufacturing_production_scraps.integration.test.ts` from `sdk/bun`: passed with no warnings.
- `git diff --check`: passed.
- Full Manufacturing regression: `bun test ./test/manufacturing*.integration.test.ts --timeout 20000` from `sdk/bun/sample`: 93 tests, 914 assertions passed. An earlier concurrent POS write briefly produced discovery errors; the final rerun completed cleanly, and no POS files were changed.

The focused assertions cover source action/modes, page/API ownership, MO and
company scoping, filtered/empty/not-found/503 states, migration replay,
create validation, and stale/delete guards.
