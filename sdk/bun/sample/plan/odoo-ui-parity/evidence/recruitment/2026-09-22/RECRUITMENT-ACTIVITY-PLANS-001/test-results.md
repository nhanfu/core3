# Test results

- `bun test test/recruitment_activity_plans.integration.test.ts` — 4 passed,
  0 failed, 49 assertions.
- `bun run audit` — passed: 789 pages, 798 routes, 1626 datasources.
- `bunx eslint test/recruitment_activity_plans.integration.test.ts` — passed.
- `git diff --check` — passed.

The focused suite covers page/API separation through matching `page.id`,
deterministic seeds and idempotent migration reruns, active/archived search,
empty results, ordered activity-step persistence, create/update/delete,
duplicate/name/model/JSON-shape validation, archive/restore transitions,
missing/stale records, manager permission/error contracts, and file-backed
restart persistence.

The full Recruitment regression `bun test ./test/recruitment*.integration.test.ts
--timeout 20000` passed 51 tests / 485 assertions across 14 files. One stale
Recruitment-owned Applicants view expectation was updated to include the
already implemented Calendar view; no product failure remained.
