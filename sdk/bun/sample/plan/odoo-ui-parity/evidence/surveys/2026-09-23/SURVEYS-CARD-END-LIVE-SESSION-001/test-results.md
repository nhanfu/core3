# Test results

Command:

```text
bun test test/surveys_card_end_live_session.integration.test.ts --timeout 20000
```

Result: **3 passed, 0 failed, 15 assertions**.

Coverage:

- page/API binding, exact label, permission, visibility, and session projection;
- authenticated actor and optimistic-version guards;
- Ready session close, current-question clearing, version increment, and
  active-attendee completion and idempotent replay refusal;
- file-backed DuckDB reopen retaining Closed state and row version.

Additional checks:

- `bunx eslint test/surveys_card_end_live_session.integration.test.ts` — pass;
- `git diff --check` — pass.
