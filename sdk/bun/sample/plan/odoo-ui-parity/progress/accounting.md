# Accounting parity progress

Module owner: accounting
Wave: first execution wave
QA assignment: dispatchable accounting QA slot (bounded event tasks)
Status: ready-for-test (runtime retested; full browser matrix in progress)
Verification trigger: merge-candidate
Candidate commit: `35e618aa776b90e97f3c59a092114b3c7997e39f`

## Scope inventory

- Odoo source: `account` (Odoo 19 Community, demo-enabled reference).
- Core3 menu families: Invoicing, Accounting, Review, Reporting, and Configuration.
- Core3 implementation: 79 page YAML files, 61 page-scoped API fragments, accounting permissions, workflows, storage, deterministic migrations, and focused integration coverage.
- Required runtime contract: page YAML owns layout; matching `api/<surface>.yaml` owns datasource/actions; CRUD uses FormView/server-form contracts; rendered HTML follows the Core3 Fluent `html.js` seam.

## Verification evidence

| Trigger | Evidence | Result |
| --- | --- | --- |
| Focused accounting suite, all files | `bun test ./test/accounting*.integration.test.ts`: 90 tests, 1,010 assertions; 86 pass, 4 timeout at the default 5s timeout under the combined run | conditional; rerun failures independently |
| Timeout retests | `bun test --timeout 20000 ./test/accounting_entries_to_review.integration.test.ts` | 2 pass, 11 assertions |
| Timeout retests | `bun test --timeout 20000 ./test/accounting_journal_detail.integration.test.ts` | 2 pass, 13 assertions |
| Timeout retests | `bun test --timeout 20000 ./test/accounting_journal_items_views.integration.test.ts` | 2 pass, 17 assertions |
| Timeout retests | `bun test --timeout 20000 ./test/accounting_journals_catalog.integration.test.ts` | 3 pass, 38 assertions |
| Runtime readiness | `bun run agent:module -- accounting --port=4011`; `GET /api/modules` | pass; isolated accounting process listened and returned 200 |
| Authenticated browser | `/accounting/journals`, 1440x900 and 390x844 | Core3 render pass after authenticated menu refresh and shared plum shell correction; 0 page/request errors, 6 visible menu entries, no horizontal overflow; paired Odoo toolbar comparison remains pending |
| Post-merge route matrix | All 80 Accounting routes at 1440x900 and 390x844 | 160 authenticated route checks; 80/80 desktop and 80/80 mobile passed after a 1.2s render settle; no blank/redirect, page/request error, or horizontal overflow | pass; full interaction and paired visual states remain open |

## Remaining gates

- Preserve the verified runtime repair and expand the authenticated browser matrix across the remaining accounting routes.
- Complete the paired visual comparison for toolbar geometry and record the shell/auth-cache repair commit `3b3e2106`.
- Run authenticated Core3 desktop (`1440x900`) and mobile (`390x844`) checks against the committed candidate, including CRUD, persistence, workflow, and permission denial.
- Compare the same states against the authenticated Odoo reference and keep captures under `/tmp/core3-odoo-parity/` only.
- Resolve the combined-suite timeout policy (serial execution or a documented timeout) before module sign-off.

## Ownership boundary

This file records accounting progress only. The aggregate `progress.md` is QA-owned and is not edited by the module owner.
