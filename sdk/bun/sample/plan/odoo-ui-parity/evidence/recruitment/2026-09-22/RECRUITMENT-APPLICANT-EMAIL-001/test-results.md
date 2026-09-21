# Test results

Expected scoped results for the submitted implementation:

- `bun test test/recruitment_applicant_email.integration.test.ts` — 4 passed,
  0 failed, 29 assertions.
- `bun test ./test/recruitment*.integration.test.ts --timeout 20000` — 55
  passed, 0 failed, 514 assertions across 15 files.
- `bun run audit` — passed: 797 pages, 806 routes, 1644 datasources.
- `bunx eslint test/recruitment_applicant_email.integration.test.ts` — passed.
- `bun run frontend:build` — passed.
- `git diff --check` — passed.

The focused suite covers contract binding, multi-applicant persistence and
restart, active-template/content validation, and actor/company/recipient
atomicity guards.
