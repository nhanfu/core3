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

## Test cases

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| CHAT-FUNC-001 | Page/API page-id join and real query-backed datasources | `bun test ./test/chat*.integration.test.ts` — 20 tests, 134 assertions | pass |
| CHAT-FUNC-002 | Persisted conversations, message reads, create mutation, participant permission boundary | same focused suite | pass |
| CHAT-REG-001 | Global page discovery and route/datasource audit | `bun run audit` — 647 pages, 662 routes, 1112 datasources | pass |
| CHAT-BROWSER-001 | Authenticated desktop/mobile Odoo/Core3 comparison | no authenticated captures; browser capability unavailable | blocked |

## Bugs and retests

| Bug ID | Failure | Fix | Retest | Status |
| --- | --- | --- | --- | --- |
| CHAT-QA-001 | Query-backed datasources also declared mock data, causing datasource schema failure and masking persistence behavior | removed redundant mock blocks; added migration-backed rows and guards | focused Chat suite passes | fixed |

## Sign-off

- Functional: pass for focused scope
- Permissions: pass for participant guard
- Persistence/data integrity: pass for focused scope
- Desktop/mobile visual parity: blocked
- Tester decision: not signed off until committed candidate and browser evidence
