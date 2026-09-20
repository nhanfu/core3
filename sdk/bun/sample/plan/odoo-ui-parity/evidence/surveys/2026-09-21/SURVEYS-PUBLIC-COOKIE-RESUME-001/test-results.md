# Verification

- `bun test test/surveys_public_cookie_resume.integration.test.ts`: **3
  passed / 19 assertions**.
- Focused public regression (cookie, sections, begin, response, restart,
  next, previous, answer validation, deadline): **24 passed / 200 assertions**.
- The cookie test covers paired page/API declarations, `Set-Cookie`, cookie
  resume, explicit-token precedence, malformed/stale-cookie fall-through,
  concurrent replay, and file-backed DuckDB reopen.
- `bun test test/surveys*.integration.test.ts`: **86 passed / 5 failed / 699
  assertions** across 24 files. The five failures are the known DuckDB
  migration rollback/dependent-entry cases (4) and the pre-existing
  authenticated test-entry fixture-count case (1); no cookie-resume test
  failed.
- `bunx eslint test/surveys_public_cookie_resume.integration.test.ts
  services/surveys/module.ts`: **pass**.
- `bun run audit`: **pass**, 694 pages / 703 routes / 1304 datasources.
- `git diff --check`: **pass**.
