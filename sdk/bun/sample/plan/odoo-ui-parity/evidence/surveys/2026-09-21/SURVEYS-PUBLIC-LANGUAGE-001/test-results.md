# SURVEYS-PUBLIC-LANGUAGE-001 verification

Date: 2026-09-21

## Focused

`bun test test/surveys_public_language.integration.test.ts`

- 2 passed, 0 failed
- 25 assertions
- Covers paired YAML page/API contracts, bilingual fixture metadata,
  unsupported-language rejection without insertion, concurrent idempotent
  start convergence, durable `fr_FR` persistence, file-backed restart, and
  immutable-language protection.

## Adjacent regression

`bun test test/surveys_public_language.integration.test.ts test/surveys_public_response.integration.test.ts test/surveys_public_random_selection.integration.test.ts test/surveys_public_skipped_question.integration.test.ts`

- 9 passed, 0 failed
- 107 assertions

## Static checks

- `bun run audit`: pass — 737 pages, 746 routes, 1,449 datasources.
- `bunx eslint public/components/PublicSurvey.ts services/surveys/module.ts test/surveys_public_language.integration.test.ts`: pass.
- `git diff --check` on the Surveys slice: pass.
