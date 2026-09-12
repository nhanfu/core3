# Chat QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/chat-desktop.png and chat-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA slot: wave-1 chat assignment
Module owner: chat module owner
Verification trigger: merge-candidate
Candidate commit: `137d77a0aab0f3f40ff3bddee2362b2833cd7518`
QA state: ready-for-test

Detailed execution matrix: [`test-plans/chat.md`](test-plans/chat.md). It is
the module-level source for CRUD, workflow, actor, persistence, Temporal, and
paired Odoo visual gates.

## Test cases

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| CHAT-FUNC-001 | Page/API page-id join and real query-backed datasources | `bun test ./test/chat*.integration.test.ts` — 21 tests, 142 assertions | pass |
| CHAT-FUNC-002 | Persisted conversations, message reads, create mutation, participant permission boundary | same focused suite | pass |
| CHAT-WORKFLOW-001 | Message send/read/unread/star lifecycle | `chat_message_lifecycle.integration.test.ts`; message and participant markers persist, thread version advances 1 → 3, stale star returns 409 | pass |
| CHAT-REG-001 | Global page discovery and route/datasource audit | `bun run audit` — 659 pages, 669 routes, 1134 datasources | pass |
| CHAT-BROWSER-001 | Authenticated desktop/mobile Core3 route/render smoke | Isolated Chat runner `:4317` with admin login; seeded Discuss conversations rendered at 1440x900 and 390x844 with no page errors, failed requests, blank/redirect result, or horizontal overflow; captures `/tmp/core3-odoo-parity/chat-desktop.png` and `chat-mobile.png` | pass for Core3 runtime; paired Odoo comparison remains open |

## Bugs and retests

| Bug ID | Failure | Fix | Retest | Status |
| --- | --- | --- | --- | --- |
| CHAT-QA-001 | Query-backed datasources also declared mock data, causing datasource schema failure and masking persistence behavior | removed redundant mock blocks; added migration-backed rows and guards | focused Chat suite passes | fixed |
| CHAT-QA-002 | `form_view` file stem `channel-detail` was not accepted when canonical page ID was `chat-channel-detail`, causing detail-page lookup 404 | current working tree | Shared YAML page endpoint now registers/resolves file-stem aliases; authenticated `:4326` probes return HTTP 200 for both alias and canonical ID | fixed |

## Sign-off

- Functional: pass for focused scope
- Permissions: pass for participant guard
- Persistence/data integrity: pass for focused scope
- Desktop/mobile visual parity: Core3 runtime pass; paired Odoo comparison pending
- Tester decision: conditional; browser CRUD/actor matrix and paired Odoo comparison remain open

## QA execution — candidate 137d77a0 (2026-09-13)

- Trigger: `merge-candidate`; exact HEAD verified as
  `137d77a0aab0f3f40ff3bddee2362b2833cd7518` in the paired Chat worktree.
- Bounded functional suite: `bun test ./test/chat*.integration.test.ts
  --timeout 20000` — **21 passed, 0 failed, 143 expect() calls across 7
  files**. This covers the participant persistence change, Chat navigation,
  channels, message lifecycle, notifications, roles, and voice/video/canned
  responses.
- Permission/persistence checks: passed within the focused suite. The changed
  `create_thread` path persisted creator plus resolved participants and
  rejected an unknown recipient with `CHAT_PARTICIPANTS_INVALID`/422; message
  lifecycle and configuration stale/invalid guards also passed. Durable
  restart persistence and the complete actor/company matrix remain unexecuted.
- UI audit: `bun run audit` passed — 659 pages, 668 routes, 1134 datasources.
- Lint: **blocked** — `bun run lint` exits 1 on unrelated pre-existing
  `sample/test/website_public.integration.test.ts:31` and `:33`
  (`no-unsafe-optional-chaining`). No Chat candidate file is named in the
  lint output.
- Diff check: `git diff --check 137d77a0^ 137d77a0` passed with no output.
- Authenticated browser check: isolated runner
  `bun run agent:module -- chat --port=4328` started and
  `GET /api/modules` returned HTTP 200 with Auth and Chat routes. Playwright
  using `/usr/bin/google-chrome` at 1440x900 and 390x844 submitted the seeded
  admin login (POST `/api/auth/login` HTTP 200), but `/api/auth/me` returned
  HTTP 401 `INVALID_TOKEN`; all tested Chat routes consequently redirected to
  `/auth/login?redirect=...`. This blocks authenticated desktop/mobile route,
  CRUD, mutation, actor, and visual checks.
- Captures: none for this candidate. The attempted capture directory
  `/tmp/core3-odoo-parity/chat-candidate-137d77a0/` contains no route evidence;
  prior Chat captures are not attributed to this commit.

## Test case updates for candidate 137d77a0

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| CHAT-FUNC-001/002/003/004/005/006/007 | Bounded Chat functional, permission, persistence, and migration-backed checks | 21/21 tests, 143 assertions; exact command and commit recorded above | pass for focused scope; restart and broader actor checks remain open |
| CHAT-REG-001 | UI audit and diff hygiene | audit 659/668/1134; `git diff --check` clean | pass |
| CHAT-BROWSER-001/CHAT-UI-001/002/003/004 | Authenticated desktop/mobile route and visual checks | runner `:4328`; login 200 followed by `/api/auth/me` 401 `INVALID_TOKEN`; no captures | blocked |
| CHAT-LINT-001 | Repository lint | `bun run lint`; unrelated `website_public.integration.test.ts:31,33` errors | blocked by pre-existing repository lint errors |

## Tester decision — candidate 137d77a0

Conditional only. The bounded Chat suite, focused permission/persistence
checks, audit, and diff check pass. Do not sign off Chat: authenticated browser
CRUD/actor/restart checks, paired desktop/mobile visual evidence, and the
repository lint gate remain open or blocked.
