# SURVEYS-PUBLIC-SKIPPED-QUESTION-001 verification

- Focused: `bun test ./test/surveys_public_skipped_question.integration.test.ts --timeout 30000`
  — **2 passed, 0 failed, 21 assertions**.
- Adjacent public regression:
  `bun test ./test/surveys_public_skipped_question.integration.test.ts ./test/surveys_public_random_selection.integration.test.ts ./test/surveys_public_response.integration.test.ts ./test/surveys_public_next_question.integration.test.ts ./test/surveys_public_previous_question.integration.test.ts --timeout 30000`
  — **13 passed, 0 failed, 126 assertions**.
- Coverage includes page/API contract ownership, public permission, required
  skip rejection without mutation, foreign-token denial, restart persistence,
  and concurrent idempotent submit with response-count integrity.
