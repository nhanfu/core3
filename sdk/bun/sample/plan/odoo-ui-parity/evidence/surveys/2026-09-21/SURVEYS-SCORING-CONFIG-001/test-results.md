# SURVEYS-SCORING-CONFIG-001 test results

Focused command:

`bun test --environment jsdom --config ../packages/client/vitest.config.ts test/surveys_scoring_settings.integration.test.ts test/surveys_certification_template.integration.test.ts test/surveys_public_scoring.integration.test.ts test/surveys_public_response_restart.integration.test.ts`

Result: **9 passed, 0 failed, 68 assertions** across 5 files.

Coverage includes:

- page/API separation and matching `page.id`;
- all four Odoo scoring modes and the 0..100 threshold;
- `surveys.write`, actor, missing, archived/stale, certification, and roaming guards;
- durable row-version updates and stale replay rejection;
- file-backed restart persistence;
- public score/pass behavior using the configured threshold;
- idempotent public submission and existing certification-template compatibility.

Additional checks:

- UI audit: **778 pages, 787 routes, 1,600 datasources**, passed.
- Scoped ESLint: passed.
- Scoped `git diff --check`: passed.
