# Test results

- `bun test test/recruitment_applicant_followers.integration.test.ts
  --timeout 20000` — 4 passed, 0 failed, 19 assertions.
- Coverage includes page/API contract, deterministic active contacts and
  subscriptions, idempotent migration, multi-applicant add/remove, notify
  audit, invalid contact/company/notify guards, and file-backed restart.
- Full Recruitment regression, ESLint, audit, frontend build, and diff-check
  are recorded in `verification.md` after finalization.
