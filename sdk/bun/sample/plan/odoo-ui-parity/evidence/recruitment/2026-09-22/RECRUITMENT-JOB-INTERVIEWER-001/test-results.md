# Test results

- `bun test test/recruitment_interviewer_openings.integration.test.ts --timeout 20000`
  — 4 passed, 0 failed, 28 assertions.
- `bun test ./test/recruitment*.integration.test.ts --timeout 20000` — 76
  passed, 0 failed, 658 assertions across 20 files.
- `bun run audit` — passed: 839 pages, 847 routes, 1,749 datasources.
- `bun run frontend:build` — passed; Recruitment CSS compilation and Vite
  production build completed without warnings.
- `bunx eslint test/recruitment_interviewer_openings.integration.test.ts` —
  passed.
- `git diff --check` — passed after implementation and evidence updates.
