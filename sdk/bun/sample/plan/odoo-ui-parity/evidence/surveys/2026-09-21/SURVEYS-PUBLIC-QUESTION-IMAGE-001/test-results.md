# Verification — `SURVEYS-PUBLIC-QUESTION-IMAGE-001`

- Focused image/background checks: **4 passed / 44 assertions**.
- Focused Surveys integration trio: **27 passed / 264 assertions**.
- Public/core Surveys regression: `bun test test/surveys_public*.integration.test.ts test/surveys.integration.test.ts` — **75 passed / 682 assertions**.
- Scoped lint: `bunx eslint public/components/PublicSurvey.ts services/surveys/module.ts` — passed.
- Scoped diff-check: `git diff --check -- services/surveys public/components/PublicSurvey.ts test/surveys_public_question_image.integration.test.ts plan/odoo-ui-parity` — passed.
- UI audit: `bun run audit` — passed with 716 pages, 725 routes, and 1370 datasources after the shared boundary repair.
- Authenticated Core3 browser probe: passed at 1440x900 and 390x844; both public image assets returned HTTP 200 `image/svg+xml`, with no request/page failures and no horizontal overflow.

The focused lifecycle verifies paired YAML, durable SVG content, start-scoped answer-token authorization, question/choice ownership, replay, file-backed restart, malformed/foreign IDs, and non-GET rejection.
