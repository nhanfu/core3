# Accounting parity progress

Module owner: accounting
Wave: first execution wave
QA assignment: dispatchable accounting QA slot (bounded event tasks)
Status: qa-verified-partial (Journal Items export candidate)
Verification trigger: merge-candidate
Candidate commit: `fd00ae4d84e35cd87127a104701b8c30b44e7bfb`
Owner batch: bank statement attachment workflow (pending verification)

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
| Authenticated CRUD boundary | Journals FormView and unauthorized Accounting read | Admin create/reload persisted a journal; Fleet Manager received `Requires permission: accounting.read` | pass; broader workflow and permission matrix remains open |
| Journal Items export contract | `accounting_journal_items_views.integration.test.ts` | Page/API `page.id` binding, `accounting.read` action declaration, deterministic datasource projection, and RFC 4180 CSV serialization pass; shared renderer provides XLSX download | pass at contract level; authenticated download evidence and other Accounting export/attachment/print actions remain open |
| Bank Statement attachment workflow | `accounting_bank_statement_attachments.integration.test.ts` | Write upload/read-only denial; metadata and storage key persist across DuckDB close/reopen; authenticated download returns original CSV bytes | pass at focused API/storage level; browser upload and paired Odoo comparison remain open |
| QA-1 candidate browser verification | `bun run agent:module -- accounting --port=4331`; authenticated Playwright | Admin desktop/mobile both exposed Export in the list utility menu and downloaded a valid 4,453-byte XLSX; Journal Items remained `1-4 / 4` with `INV/2026/0001` after reload; Fleet user received `Requires permission: accounting.read`; zero browser/request errors and no overflow | pass for candidate slice; broader Accounting sign-off remains open |
| Journal Items export repair candidate | `99a8f86f`; focused client/export checks plus conditional browser evidence | DOM-attached anchor and deferred cleanup pass; desktop/mobile Journal Items rendered four rows without overflow; XLSX browser download event was not independently captured in this candidate event | conditional; broader Accounting export/attachment/print and Odoo gates remain open |

| Payment Terms bounded reconciliation | `b98f9e80` + `5914d094`; QA candidate evidence and active-branch verification | Candidate QA passes focused `3/51`, Accounting `44/582`, audit `404/410/708`, authenticated CRUD lifecycle, permissions, guards, atomicity, and blank-checkbox create; active branch already owns the earlier compatible slice and its focused suite passes `3/43` | reconciled without duplicate merge; broader export/attachment/print/Odoo gates remain open |

## Remaining gates

- Preserve the verified runtime repair and expand the authenticated browser matrix across the remaining accounting routes.
- Complete the paired visual comparison for toolbar geometry and record the shell/auth-cache repair commit `3b3e2106`.
- Run authenticated Core3 desktop (`1440x900`) and mobile (`390x844`) checks against the committed candidate, including CRUD, persistence, workflow, and permission denial.
- Compare the same states against the authenticated Odoo reference and keep captures under `/tmp/core3-odoo-parity/` only.
- Resolve the combined-suite timeout policy (serial execution or a documented timeout) before module sign-off.
- Complete the remaining Accounting browser CRUD/actor/workflow gates, including
  paired Odoo comparison and non-Journal-Items import/attachment/print actions,
  before full module sign-off.

## Ownership boundary

This file records accounting progress only. The aggregate `progress.md` is QA-owned and is not edited by the module owner.

## QA verification: candidate `9c19f5a4` (2026-09-13)

- Focused attachment test: **1 pass, 11 assertions, 0 failures**; read/write
  permissions, restart persistence, optimistic concurrency, and download
  bytes are covered.
- `bun run audit`: pass — 659 pages, 668 routes, 1,140 datasources.
- `git diff --check 9c19f5a4^ 9c19f5a4`: pass.
- `bun run lint` is unavailable because this worktree has no `lint` script.
- Combined Accounting regression was terminated after hanging before its
  summary; it is unverified.
- Authenticated Core3 desktop/mobile captures are outside Git at
  `/tmp/core3-odoo-parity/accounting-bank-statement-attachments-20260913/`.
  Runtime health and viewport fit passed, and mobile exposed the attachment
  file input, but upload/download persistence was not proven end-to-end.
- Odoo login endpoint returned HTTP 200; no fresh authenticated paired
  attachment evidence was completed.

QA state for `9c19f5a4`: `qa-verified-partial`; this is not Accounting module
sign-off. Browser upload/download, full regression, lint-equivalent, and
paired Odoo gates remain open.
## Repair wave: Sales and Purchases export (2026-09-13)

Sales and Purchases now have page/API-bound, `accounting.read`-guarded Export
actions. Focused contract tests and authenticated desktop/mobile XLSX download
checks pass; broader Accounting attachment and print actions remain open.
