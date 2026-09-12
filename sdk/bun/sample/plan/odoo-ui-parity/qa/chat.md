# Chat QA ledger

QA slot: wave-1 chat assignment
Module owner: chat module owner
Verification trigger: merge-candidate
Candidate commit: working tree candidate; pending owner commit
QA state: qa-failed

## Test cases

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| CHAT-FUNC-001 | Page/API page-id join and real query-backed datasources | `bun test test/chat.integration.test.ts` — 5 tests, 34 assertions | pass |
| CHAT-FUNC-002 | Persisted conversations, message reads, create mutation, participant permission boundary | same focused suite | pass |
| CHAT-REG-001 | Global page discovery and route/datasource audit | `bun run audit` — 647 pages, 662 routes, 1112 datasources | pass |
| CHAT-BROWSER-001 | Authenticated desktop/mobile Odoo/Core3 comparison | no authenticated captures yet | pending |

## Bugs and retests

| Bug ID | Failure | Fix | Retest | Status |
| --- | --- | --- | --- | --- |
| CHAT-QA-001 | Query-backed datasources also declared mock data, causing datasource schema failure and masking persistence behavior | removed redundant mock blocks; added migration-backed rows and guards | focused Chat suite passes | fixed |

## Sign-off

- Functional: pass for focused scope
- Permissions: pass for participant guard
- Persistence/data integrity: pass for focused scope
- Desktop/mobile visual parity: pending
- Tester decision: not signed off until committed candidate and browser evidence
