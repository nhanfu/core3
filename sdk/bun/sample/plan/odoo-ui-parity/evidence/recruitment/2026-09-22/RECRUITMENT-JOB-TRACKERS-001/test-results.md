# Test results

- `bun test test/recruitment_job_trackers.integration.test.ts --timeout 20000`
  — 4 passed, 0 failed, 46 assertions.
- `bun test ./test/recruitment*.integration.test.ts --timeout 20000`
  — 72 passed, 0 failed, 630 assertions across 19 files.
- `bunx eslint test/recruitment_job_trackers.integration.test.ts` — passed.
- `bun run audit` — passed (834 pages, 842 routes, 1,739 datasources).
- `bun run frontend:build` — passed.
- `git diff --check` — passed.
- Coverage includes Odoo source trace, page/API binding, deterministic
  migration, list/search/empty/transport, CRUD, scope/actor/duplicate/
  validation/stale guards, and file-backed restart.
- BrowserSkill reference capture — blocked by existing tab ownership; see
  `browser-check.md`.
