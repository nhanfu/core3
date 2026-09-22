# Test results

- Focused: `bun test ./test/project_task_share.integration.test.ts --timeout
  30000` — 3 passed, 0 failed, 22 assertions.
- Project corpus: `bun test ./test/project*.integration.test.ts --timeout
  30000` — 84 passed, 0 failed, 833 assertions across 29 files.
- UI audit: `bun run audit` — 853 pages, 861 routes, 1,797 datasources.
- Project CSS: `bun run css:build:project` — passed.
- Frontend: `bun run frontend:build` — passed, 184 modules transformed.
- Hygiene: `git diff --check` — passed.
