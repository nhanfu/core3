# `SURVEYS-INVITE-ATTACHMENT-001` verification

- Focused: `bun test --max-concurrency 1 test/surveys_invite_attachments.integration.test.ts`
  — **3 passed, 32 assertions**.
- Adjacent invite/catalog regression:
  `bun test --max-concurrency 1 test/surveys_invite.integration.test.ts
  test/surveys_invite_attachments.integration.test.ts test/surveys.integration.test.ts`
  — **29 passed, 274 assertions**.
- UI audit: **746 pages, 755 routes, 1,483 datasources**; passed.
- Scoped ESLint: `test/surveys_invite_attachments.integration.test.ts` passed.
- `git diff --check`: passed.
- Covered boundaries: page/API `page.id` joining, deterministic fixture replay,
  authenticated write permission, required actor, missing/archived invite,
  stale invitation row version, invalid empty upload, duplicate idempotency
  guard, persisted bytes, download authorization, and file-backed restart.

Full repository regression was not run for this bounded slice.
