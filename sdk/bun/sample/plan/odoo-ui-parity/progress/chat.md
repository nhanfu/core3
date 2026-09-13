# Chat progress

Module owner: chat module owner
QA slot: wave-1 chat assignment
State: ready-for-test
Candidate commit: `137d77a0aab0f3f40ff3bddee2362b2833cd7518`

## Current verification

- Focused Chat integration: 20 tests, 134 assertions, pass.
- Real query-backed thread/message/attachment datasources validated.
- Participant ownership guard and persisted conversation mutation validated.
- Global UI audit: 647 pages, 662 routes, 1112 datasources, pass.
- Authenticated desktop/mobile browser comparison: blocked; `js_repl` and the
  sample Playwright dependency are unavailable in the owner session.

## Next trigger

`merge-candidate` after the Chat owner commits the current candidate, followed
by `post-merge` after integration.

## Bounded batch — Discuss conversation participant CRUD (20260913)

- Fixed the existing `create_thread` action so participant emails are resolved
  through the Auth service boundary and persisted into `chat_participants`.
  The creator remains a participant, duplicate IDs are idempotently ignored,
  and any unknown recipient rejects the transaction with
  `CHAT_PARTICIPANTS_INVALID`.
- Focused verification passes all Chat integration suites: 21 tests and 143
  assertions. The sample UI audit passes with 659 pages, 668 routes, and 1134
  datasources; changed TypeScript ESLint and `git diff --check` pass; the
  sample frontend production build passes.
- Authenticated browser mutation proof remains a gate for this owner session:
  no browser automation capability is available here, so no screenshot or
  visual-parity claim is made.

## QA verification — candidate 137d77a0 (2026-09-13)

- Exact candidate HEAD: `137d77a0aab0f3f40ff3bddee2362b2833cd7518`.
- Bounded Chat suite: **21/21 passed, 143 assertions** across 7 integration
  files. Participant email resolution/persistence, creator participation,
  duplicate handling, and `CHAT_PARTICIPANTS_INVALID` rejection passed.
- Permission/persistence: focused checks passed; durable restart persistence
  and the complete actor/company matrix remain open.
- Audit passed: 659 pages, 668 routes, 1134 datasources. `git diff --check`
  passed.
- Repository lint is blocked by unrelated existing errors at
  `sample/test/website_public.integration.test.ts:31,33`.
- Authenticated module runner `:4328` started and `/api/modules` returned 200,
  but seeded admin login was followed by `/api/auth/me` HTTP 401
  `INVALID_TOKEN`; desktop 1440x900 and mobile 390x844 Chat route checks all
  redirected to login. No candidate captures were produced.
- QA state: **conditional / not signed off**. Browser CRUD, actor boundaries,
  restart persistence, and paired Odoo desktop/mobile comparison remain
  blocked or unexecuted.

## R2 blocker: `CHAT-HTTP-GUARD-001`

QA candidate `902ae72d` is blocked: live stale, non-participant, and
missing-thread multipart uploads return HTTP 500 instead of declared 409/403/404.
Route the repair to existing owner `agent/chat-wave-dev1` in
`/home/nhanjs/projects/core3-worktrees/chat-wave-dev1`; trace guard/error
translation, retain atomicity, and add focused HTTP regressions before
`QA-CHAT-WAVE-20260913-R2` retest. Do not integrate `902ae72d`.

## R2 retest blocker: `b25e95b3`

The repair passes upload identity, list/download, reload, cleanup,
no-partial-write, desktop/mobile, 24 tests/173 assertions, audit, builds,
ESLint, and diff-check. `CHAT-HTTP-GUARD-001` remains open because stale,
non-participant, and missing-thread uploads still return HTTP 500 despite
correct domain codes. Root cause: topic normalization drops status during error
translation. Route the same-module status-preservation repair to
`agent/chat-wave-dev1` in `/home/nhanjs/projects/core3-worktrees/chat-wave-dev1`,
then rerun focused HTTP QA. Do not integrate `b25e95b3`.
