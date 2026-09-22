# Test results

- Focused: `bun test test/recruitment_applicant_job_applications.integration.test.ts`
  — 5 passed, 0 failed, 23 expect calls.
- Module regression: `bun test ./test/recruitment*.integration.test.ts
  --timeout 20000` — 64 passed, 0 failed, 559 expect calls across 17 files.
- Targeted ESLint: `bunx eslint test/recruitment_applicant_job_applications.integration.test.ts`
  — passed.
- UI audit: `bun run audit` — passed: 808 pages, 817 routes, 1679 datasources.
- CSS: `bun run css:build:global && bun run css:build:recruitment` — passed.
- Frontend: `bun run frontend:build` — passed.
- `git diff --check` — passed.

The first regression attempt exposed and fixed a migration integration issue:
the applicant table rebuild now restores its primary key for existing email
template `ON CONFLICT (id)` behavior, and its column addition is rerunnable.
