# Test results

Command:

```text
bun test ./test/project_task_recurrence.integration.test.ts ./test/project_task_detail.integration.test.ts ./test/project_task_subtasks.integration.test.ts ./test/project_task_dependencies.integration.test.ts --timeout 30000
```

Result: **13 passed, 0 failed, 111 assertions**.

Additional checks: `bun run css:build:project`, `bun run frontend:build`, and
`git diff --check` passed.
