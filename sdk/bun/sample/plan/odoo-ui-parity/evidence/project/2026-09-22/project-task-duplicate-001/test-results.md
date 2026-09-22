# Test results

- Focused: `bun test ./test/project_task_duplicate.integration.test.ts
  --timeout 30000` — 3 passed, 0 failed, 20 expectations.
- Project regression: `bun test ./test/project*.integration.test.ts --timeout
  30000` — 87 passed, 0 failed, 853 expectations across 30 files.
- UI audit: `bun run audit` — 857 pages, 865 routes, 1,810 datasources;
  passed.
- Project CSS: `bun run css:build:project` — passed.
- Frontend: `bun run frontend:build` — passed, 184 modules transformed.
- Hygiene: `git diff --check` — passed.
