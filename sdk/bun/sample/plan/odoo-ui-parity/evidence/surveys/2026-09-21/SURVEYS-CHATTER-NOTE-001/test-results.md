# SURVEYS-CHATTER-NOTE-001 verification

- Focused integration: `bun test test/surveys_chatter_note.integration.test.ts` — **3 passed, 12 assertions**.
- Chatter/activity compatibility: `bun test test/surveys_activity.integration.test.ts test/surveys_chatter_note.integration.test.ts` — **6 passed, 30 assertions**.
- Covered contracts: page/API join, note action permission and actor guards, archived/stale/content validation, deterministic replay rejection, migration replay, and file-backed DuckDB restart.
- Full repository regression was not run.
- `git diff --check` passed before commit.
