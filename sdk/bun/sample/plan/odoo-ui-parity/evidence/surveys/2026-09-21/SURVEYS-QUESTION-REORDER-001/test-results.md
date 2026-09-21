# SURVEYS-QUESTION-REORDER-001 verification

- `bun test test/surveys_question_reorder.integration.test.ts`: **3 passed,
  0 failed, 20 assertions**.
- Bounded adjacent regression:
  `bun test test/surveys_question_reorder.integration.test.ts
  test/surveys_question_create.integration.test.ts
  test/surveys_question_duplicate.integration.test.ts
  test/surveys_live_speed_rating.integration.test.ts
  test/surveys_follower.integration.test.ts`: **15 passed, 0 failed, 101
  assertions**.
- `bunx eslint test/surveys_question_reorder.integration.test.ts`: passed.
- `git diff --check`: passed.

`bun run audit` and the broader discovery-based Surveys test were attempted
but stopped on the unrelated concurrent Inventory API file
`services/inventory/api/physical-inventory.yaml` with `YAML Parse error:
Unexpected token`. The full repository regression was not run.
