# Verification

Focused command:

`bun test test/surveys_public_survey_timer.integration.test.ts test/surveys_public_deadline.integration.test.ts test/surveys_public_response.integration.test.ts test/surveys_public_response_restart.integration.test.ts`

Result: **9 passed, 0 failed, 99 assertions**.

The new timer test covers:

- API/page pairing, `surveys.public` permissions, timer guard declarations,
  renderer binding, and migration version.
- public start returning a durable `start_datetime` and timer configuration;
- expired GET/progress returning HTTP 410 with
  `SURVEY_PUBLIC_TIME_LIMIT_EXPIRED` and unchanged answer state/data;
- restoring a future start timestamp, saving progress, closing DuckDB,
  reopening/migrating, and replaying the same token without duplication.

Adjacent response/deadline tests also pass, proving the new guard does not
replace the existing response deadline or restart/idempotency behavior.

Bounded full Surveys command:

`bun test ./test/surveys*.integration.test.ts`

Result: **122 passed, 4 failed, 1,065 assertions** across 126 tests. The four
failures are the pre-existing DuckDB reverse-chain rollback/dependent-entry
failures in `test/surveys_migrations.integration.test.ts`, now reported at
earlier `survey_questions` column drops after the timer migration's response
index-safe rollback. No timer test failed.
