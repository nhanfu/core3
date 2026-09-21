# Focused verification

Command:

```text
bun test test/surveys_certification_report.integration.test.ts
```

Result: **4 passed, 0 failed, 22 assertions**.

Coverage includes page/API `page.id` joining, passed-only report access,
permission and actor guards, deterministic replay, concurrent calls, migration
replay, and file-backed DuckDB restart.
