# QA inventory

- Focused integration: `test/surveys_public_next_question.integration.test.ts`
  and `test/surveys_public_previous_question.integration.test.ts`.
- Focused result: 6 passed, 0 failed, 44 assertions.
- Scoped ESLint: pass.
- Repository audit: pass, 687 pages / 696 routes / 1,279 datasources.
- `git diff --check`: pass.
- Full repository regression: not run for this bounded finalization.
- Odoo live mutation probe: blocked by missing stable active answer-token
  fixture; no Odoo sign-off claimed.
