# Test results

- Focused: `bun test ./test/project_duplicate.integration.test.ts --timeout
  30000` — 3 passed, 0 failed, 23 assertions.
- Project regression: `bun test ./test/project*.integration.test.ts --timeout
  30000` — 95 passed, 0 failed, 907 assertions across 33 files.
- UI audit: `bun run audit` — 865 pages, 873 routes, 1,829 datasources;
  passed.
- Project CSS: `bun run css:build:project` — passed.
- Frontend: `bun run frontend:build` — passed, 184 modules transformed.
- Hygiene: `git diff --check` — passed.
