# Test results

- `bun test test/recruitment_applicant_followers.integration.test.ts
  --timeout 20000` — 4 passed, 0 failed, 19 assertions.
- Coverage includes page/API contract, deterministic active contacts and
  subscriptions, idempotent migration, multi-applicant add/remove, notify
  audit, invalid contact/company/notify guards, and file-backed restart.
- `bun test ./test/recruitment*.integration.test.ts --timeout 20000` — 59
  passed, 0 failed, 534 assertions across 16 files.
- `bunx eslint test/recruitment_applicant_followers.integration.test.ts` —
  passed.
- `bun run audit` — passed: 805 pages, 814 routes, 1,664 datasources.
- `bun run frontend:build` — passed: Vite production build completed.
- `git diff --check` — passed for the Recruitment-owned diff.
