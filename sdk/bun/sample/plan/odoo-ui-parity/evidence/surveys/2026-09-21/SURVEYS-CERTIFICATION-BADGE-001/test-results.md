# Focused verification

Commands:

```text
bun test test/surveys_certification_badge.integration.test.ts
bun test test/surveys_certification_badge.integration.test.ts test/surveys_certification_report.integration.test.ts test/surveys.integration.test.ts
```

Results: **4 passed / 22 assertions** for the badge slice; **31 passed / 264
assertions** across the badge, report, and Surveys catalog regression.

Coverage includes page/API joining, passed-only access, manage/read permission
boundaries, actor rejection, deterministic replay, concurrent calls, migration
replay, and file-backed DuckDB restart.
