# Test results

- `bun test test/crm_team_overdue_opportunities.integration.test.ts` — 2 pass,
  17 assertions.
- `bun test test/crm_team_overdue_opportunities.integration.test.ts test/crm_team_opportunities.integration.test.ts test/crm_team_members.integration.test.ts` — 6 pass, 52 assertions.
- `bunx eslint sample/test/crm_team_overdue_opportunities.integration.test.ts` — pass, no warnings.
- `bun run audit` — pass: 786 pages, 795 routes, 1,620 datasources.
- `bun run frontend:build` — pass.
- `git diff --check` — pass for the CRM changes.

The focused test re-applies migrations, verifies page/API discovery and the
team stat action, filters future and closed opportunities, checks empty/search/
forbidden/missing-team states, and closes/reopens the file-backed DuckDB before
asserting the seeded overdue record remains visible.
