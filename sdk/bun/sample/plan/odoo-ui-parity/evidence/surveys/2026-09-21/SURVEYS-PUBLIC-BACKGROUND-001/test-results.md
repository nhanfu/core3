# Verification — `SURVEYS-PUBLIC-BACKGROUND-001`

- Focused: `bun test test/surveys_public_background.integration.test.ts` — **2 passed / 23 assertions**.
- Module regression: `bun test test/surveys*.integration.test.ts` — **107 passed / 5 failed / 898 assertions**. The five failures are pre-existing: four DuckDB migration rollback/dependent-entry tests and one stale Test Entry fixture-count expectation. No background test failed.
- Audit: `bun run audit` — **passed**, 714 pages / 723 routes / 1364 datasources.
- Scoped lint: `bunx eslint public/components/PublicSurvey.ts services/surveys/module.ts` — passed.
- Scoped diff check: `git diff --check -- services/surveys public/components/PublicSurvey.ts test/surveys_public_background.integration.test.ts plan/odoo-ui-parity` — passed.

The focused lifecycle verifies paired YAML, persisted URL/content, HTTP 200 SVG replay, file-backed restart, malformed-token 400, unpublished-token 404, and non-GET 405 guards.
