# Test results

Command:

```text
bun test test/manufacturing_work_center_waiting.integration.test.ts --timeout 20000
```

Result: PASS — 4 tests, 23 assertions.

Coverage includes page/API ownership, isolated discovery and route binding,
source modes, durable work-center/Waiting scoping, search/empty/transport
states, migration replay, file-backed restart persistence, and permissioned
workflow metadata.

Module-wide sweep:

```text
bun test test/manufacturing*.integration.test.ts --timeout 20000
68 pass, 10 fail, 693 assertions across 78 tests
```

The ten failures are pre-existing shared-discovery failures caused by
concurrent Project YAML: missing graph/activity metadata in
`services/project/pages/project-task-recurrence.yaml` and duplicate
`project_task_states` in `services/project/pages/tasks.yaml`. The new waiting
test passes and no Project or other non-Manufacturing path was changed.

Repository checks for this slice: targeted ESLint PASS,
`git diff --check` PASS, Manufacturing CSS build PASS. The full `bun run audit`
hits the same unrelated Project page schema error and is recorded as blocked.
