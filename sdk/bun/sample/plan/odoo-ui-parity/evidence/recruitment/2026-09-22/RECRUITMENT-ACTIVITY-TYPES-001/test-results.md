# Test results

- `bun test test/recruitment_activity_types.integration.test.ts` — 4 passed,
  0 failed, 45 assertions.
- `bun run audit` — passed: 782 pages, 791 routes, 1604 datasources.
- `bunx eslint test/recruitment_activity_types.integration.test.ts` — passed.
- `git diff --check` — passed.

The focused test covers page/API separation by matching `page.id`, deterministic
seed order and idempotent migration reruns, search and active/archived filters,
empty results, create/update/delete, validation, archive/restore transitions,
in-use deletion protection, missing/stale records, permission/error contracts,
and file-backed restart persistence.
