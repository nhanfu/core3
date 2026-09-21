# Test results

Focused command:

```text
bun test test/timesheets_portal_task_report.integration.test.ts --timeout 20000
4 pass, 0 fail, 32 expect() calls
```

Portal/task regression command:

```text
bun test test/timesheets_portal_task_report.integration.test.ts \
  test/timesheets_portal_task_hours_summary.integration.test.ts \
  test/timesheets_task_action_portal_views.integration.test.ts \
  test/timesheets_portal.integration.test.ts \
  test/timesheets_portal_grouping.integration.test.ts \
  test/timesheets_portal_visibility_domain.integration.test.ts --timeout 20000
22 pass, 0 fail, 174 expect() calls
```

Additional gates:

- `bun run css:build:timesheets` passed.
- `bun run audit` passed: 807 pages, 816 routes, 1671 datasources.
- `bun run frontend:build` passed.
- Timesheets-owned `git diff --check` passed.
