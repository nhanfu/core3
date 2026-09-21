# `SURVEYS-RESTRICTED-USERS-001` verification

- Focused: `bun test --max-concurrency 1 test/surveys_restricted_users.integration.test.ts`
  — **3 passed, 26 assertions**.
- Adjacent catalog/detail regression:
  `bun test --max-concurrency 1 test/surveys_restricted_users.integration.test.ts
  test/surveys_question_create.integration.test.ts
  test/surveys_delete.integration.test.ts test/surveys_invite.integration.test.ts
  test/surveys.integration.test.ts`
  — **34 passed, 310 assertions**.
- UI audit: **747 pages, 756 routes, 1,490 datasources**; passed.
- Scoped ESLint on `test/surveys_restricted_users.integration.test.ts` and
  `git diff --check`: passed.
- Covered boundaries: page/API joining, authenticated list/detail filtering,
  relation add/remove, missing actor, duplicate replay, stale parent/relation,
  direct relation no-disclosure, deterministic fixture, and file-backed
  restart.

Full repository regression was not run for this bounded slice.
