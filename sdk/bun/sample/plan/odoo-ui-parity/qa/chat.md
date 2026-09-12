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
Candidate commit: `57888722f02e689191bc07fcec58f7bec19f49dc`
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
