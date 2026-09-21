# Test results

Passed:

- `bun test ./test/project_all_tasks.integration.test.ts --timeout 30000` — 2
  tests, 20 assertions.
- `bun test ./test/project_all_tasks.integration.test.ts
  ./test/project.integration.test.ts ./test/project_task_detail.integration.test.ts
  ./test/project_task_subtasks.integration.test.ts
  ./test/project_task_recurrence.integration.test.ts --timeout 30000` — 15
  tests, 161 assertions.

The test covers discovery, menu/action identity, page/API ownership, source
view order, open-task filtering, My Tasks assignee scope, search, empty/error,
and reopen-equivalent persistence. Build, audit, and diff-check results are
recorded in the final QA ledger: `bun run audit` passed with 808 pages, 817
routes, and 1,673 datasources; `bun run css:build:project` passed; `bun run
frontend:build` passed with 184 modules transformed; and `git diff --check`
passed.
