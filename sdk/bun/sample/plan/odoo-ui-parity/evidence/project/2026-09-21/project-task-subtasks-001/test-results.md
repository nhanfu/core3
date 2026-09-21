# Test results

```text
bun test ./test/project_task_subtasks.integration.test.ts --timeout 30000
3 passed, 0 failed, 27 assertions
```

Assertions cover page/API matching and discovery, migration replay and stable
seed rows, search/empty/company scope, CRUD guards, workflow state validation,
stale parent/child versions, descendant protection, and close/reopen persistence.
