# Test results

- Focused: `bun test ./test/surveys_card_live_session.integration.test.ts` — **3 passed, 19 assertions**.
- Adjacent: `bun test ./test/surveys_card_live_session.integration.test.ts ./test/surveys.integration.test.ts ./test/surveys_card_questions.integration.test.ts ./test/surveys_card_stats.integration.test.ts` — **30 passed, 262 assertions**.
- Coverage includes page/API joining, source projection, permission and actor
  guards, startability and stale replay guards, durable Ready transition, and
  file-backed restart.
- Result: no focused-test warnings or failures remain.
