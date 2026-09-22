# Test results

Focused command:

```text
bun test ./test/project_task_parent.integration.test.ts --timeout 30000
```

Result: 2 tests passed, 0 failed, 8 assertions. Coverage includes page/API
separation, the `project.read` navigation contract, parent identity for a
seeded child task, root-task absence, and a missing target.
