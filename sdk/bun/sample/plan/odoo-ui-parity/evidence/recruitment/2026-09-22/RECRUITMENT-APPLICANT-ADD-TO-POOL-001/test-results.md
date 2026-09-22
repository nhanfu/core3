# Test results

- `bun test test/recruitment_applicant_add_to_pool.integration.test.ts test/recruitment_talent_pools.integration.test.ts --timeout 20000` — 8 passed, 0 failed, 84 assertions.
- `bun test ./test/recruitment*.integration.test.ts --timeout 20000` — green Recruitment regression.
- `git diff --check` — passed.
- Coverage includes source/action declarations, page/API discovery, durable copy and membership behavior, tags, idempotent replay, actor/company/archive/missing/pool guards, and file-backed restart persistence.
