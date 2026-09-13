# Accounting QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/accounting-desktop.png and accounting-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA slot: dispatchable accounting slot
Module owner: accounting
Verification trigger: merge-candidate
Candidate commit: `fd00ae4d84e35cd87127a104701b8c30b44e7bfb`
QA state: qa-verified-partial

## Wave QA fallback (2026-09-13)

- QA-1 capacity was unavailable (`agent thread limit reached`), so the main
  runner executed the single-module candidate check locally.
- `accounting_journal_items_views.integration.test.ts`: **2 passed, 20
  assertions, 0 failures**; Journal Items view contract and deterministic
  projections passed.
- Browser download, broader actor/persistence, and paired Odoo gates remain
  open; this is not module sign-off.

## QA-1 candidate verification (2026-09-13)

- Candidate under test: `fd00ae4d84e35cd87127a104701b8c30b44e7bfb`
  (`feat(accounting): add journal items export contract`), already integrated
  into the QA checkout.
- Focused export contract: `bun test
  ./test/accounting_journal_items_views.integration.test.ts --timeout 20000` —
  **2 passed, 20 assertions, 0 failures**.
- Complete Accounting contract corpus: `bun test
  ./test/accounting_*.integration.test.ts --timeout 20000` — **90 passed,
  1,013 assertions, 0 failures across 34 files**.
- Authenticated browser runner: `bun run agent:module -- accounting
  --port=4331`, using the local admin demo account. At 1440x900 and 390x844,
  the Export action was present in the list utility menu; each click produced
  `accounting-journal-items-export.xlsx`, 4,453 bytes. `file` identified the
  artifact as Microsoft Excel 2007+, and `unzip -t` reported no errors.
- Browser persistence: the admin Journal Items list remained `1-4 / 4` and
  retained `INV/2026/0001` before and after reload. The export is read-only and
  did not change the four seeded rows.
- Permission boundary: `fleet@tms.local` received `Requires permission:
  accounting.read` on `/accounting/journal-items`; no Journal Items were
  rendered.
- Browser health: both authenticated admin viewports had zero console/request
  errors and no horizontal overflow. Captures are outside Git at
  `/tmp/accounting-journal-items-desktop.png` and
  `/tmp/accounting-journal-items-mobile.png`; the downloaded artifact is at
  `/tmp/accounting-journal-items-export-qa.xlsx`.
- Finding: no defect found in the candidate export contract. Broader
  Accounting browser CRUD, actor matrix, attachments/print/import actions,
  and paired Odoo comparison remain open; this candidate is not full-module
  sign-off.

## DEV-2 bank statement attachment workflow (2026-09-13)

- Scope: `/accounting/bank-statement-detail` attachment upload/download.
- `upload_accounting_bank_statement_attachment` requires `accounting.write`;
  `download_accounting_bank_statement_attachment` requires `accounting.read`.
- `bun test test/accounting_bank_statement_attachments.integration.test.ts`:
  **1 passed, 11 assertions, 0 failures**. The test proves read-only upload
  denial, metadata/storage-key persistence across DuckDB close/reopen, and
  byte-accurate CSV download.
- Finding: no defect found in this bounded contract. Browser upload, paired
  Odoo comparison, and other Accounting attachment/print/import actions remain
  open.

## Current regression evidence (2026-09-12)

- Explicit-timeout Accounting suite: `bun test ./test/accounting_*.integration.test.ts --timeout 20000` — 90 passed, 1,013 assertions, 0 failed across 34 files.
- The prior combined-run timeout is closed as a harness-timeout issue; the
  explicit timeout completes the full current Accounting contract set.
- Existing authenticated route evidence remains 80/80 desktop and 80/80
  mobile on the module runner, plus journal create/reload and Fleet-user 403.
- The detailed per-module checklist is approved at
  `qa/test-plans/accounting.md`; paired Odoo toolbar/layout comparison and
  broader browser CRUD/actor gates remain open.

## Test-case inventory

| Test ID | Odoo action/route | Core3 route/surface | Functional scenario/state | Evidence | Result |
| --- | --- | --- | --- | --- | --- |
| ACC-FUNC-001 | Accounting menu/action register | `/accounting/*` | 79 page definitions and 61 page-scoped API fragments are present; page/API ownership is page-ID matched | `find`/discovery inspection; focused contract tests | pass for inspected accounting files |
| ACC-FUNC-002 | Invoices, credit notes, vendor bills, vendor refunds | `/accounting/invoices`, `/accounting/credit-notes`, `/accounting/vendor-bills`, `/accounting/vendor-refunds` | list/detail, create, edit, post/cancel, payment workflow, persistence, validation | accounting payment/document suites | pass in focused coverage; browser retest pending |
| ACC-FUNC-003 | Journal Entries / Entries to Review | `/accounting/journal-entries`, `/accounting/entries-to-review` | detail, draft review, search/empty, guarded posting/reset | `accounting_journal_detail`, `accounting_entries_to_review` | pass independently; combined suite timeout |
| ACC-FUNC-004 | Payments and payment configuration | `/accounting/payments`, `/accounting/customer-payments`, `/accounting/vendor-payments`, `/accounting/payment-methods`, `/accounting/payment-providers`, `/accounting/payment-tokens`, `/accounting/payment-transactions` | read/write boundaries, create/edit/archive where supported, stale/missing/transport states | 13 focused accounting suites | pass in focused coverage; browser retest pending |
| ACC-FUNC-005 | Journals, accounts, taxes, terms | `/accounting/journals`, `/accounting/chart-of-accounts`, `/accounting/taxes`, `/accounting/payment-terms` | searchable catalog CRUD, duplicate/validation/stale guards | `accounting_journals_catalog`, `accounting_journals_catalog` related catalog tests | pass independently; combined suite timeout |
| ACC-FUNC-006 | Bank statements, cash/credit registers, reconciliation | `/accounting/bank-statements`, `/accounting/cash-registers`, `/accounting/credit-statements`, `/accounting/reconciliation`, `/accounting/reconciliation-models` | list/pivot/graph, empty/error/forbidden, guarded payment/reconciliation mutation | focused accounting statement/reconciliation suites | pass in focused coverage; browser retest pending |
| ACC-FUNC-007 | Reporting and analytic actions | `/accounting/analysis`, `/accounting/bills-analysis`, `/accounting/invoice-analysis`, `/accounting/analytic-items`, `/accounting/partner-ledger`, `/accounting/sales`, `/accounting/purchases` | deterministic report queries, filters, empty/error states, declared pivot fields | focused report/ledger suites | pass in focused coverage; browser retest pending |
| ACC-FUNC-008 | Closing/configuration surfaces | `/accounting/closing`, `/accounting/secure-entries`, `/accounting/settings`, remaining configuration routes | permissioned settings, secure transition, catalog reads and forms | focused secure/configuration suites | pass in focused coverage; browser retest pending |
| ACC-FUNC-009-JI | Journal Items export | `/accounting/journal-items` | Export action is page/API-bound, read-permissioned, and serializes the real datasource projection; shared renderer downloads XLSX | `accounting_journal_items_views.integration.test.ts`; QA-1 authenticated desktop/mobile download | pass; broader Accounting export/attachment/print actions remain open |
| ACC-FUNC-009-BS | Bank Statement attachments | `/accounting/bank-statement-detail` | Permissioned upload/download persists metadata and bytes across restart | `accounting_bank_statement_attachments.integration.test.ts` | pass at focused API/storage level; browser interaction remains open |
| ACC-BROWSER-001 | Authenticated Odoo/Core3 reference | `/accounting/journals` | desktop authenticated render, seeded rows, no browser errors, overflow check | paired captures: `/tmp/core3-odoo-parity/accounting-paired/odoo-desktop.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-desktop.png`; shell retest: `/tmp/core3-odoo-parity/accounting-paired/core3-desktop-shell-fixed.png` | functional pass; shell/auth menu mismatch fixed, toolbar comparison remains open |
| ACC-BROWSER-002 | Authenticated Odoo/Core3 reference | `/accounting/journals` | mobile authenticated render, seeded rows, no browser errors, overflow check | paired captures: `/tmp/core3-odoo-parity/accounting-paired/odoo-mobile.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-mobile.png`; shell retest: `/tmp/core3-odoo-parity/accounting-paired/core3-mobile-shell-fixed.png` | functional pass; shell/auth menu mismatch fixed, toolbar comparison remains open |
| ACC-RUNTIME-001 | Core3 module runner | accounting process | startup and zero unexpected API failures | `bun run agent:module -- accounting --port=4011`; `/api/modules` returned 200 | fixed/retested |
| ACC-BROWSER-003 | Authenticated shell after login | `/accounting/journals` | menu catalog is loaded after authentication; Odoo-style shell chrome is visible at desktop and mobile | Node Playwright authenticated checks; `/tmp/core3-odoo-parity/accounting-paired/core3-desktop-shell-fixed.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-mobile-shell-fixed.png` | pass; 0 page/request errors, no horizontal overflow, 6 visible top-level menu entries |
| ACC-BROWSER-004 | Authenticated Core3 route matrix | all 80 `/accounting/*` routes | route content settles at desktop `1440x900` with no redirect, blank outlet, page/request error, or horizontal overflow | Node Playwright route matrix, 2026-09-12 | 80/80 pass |
| ACC-BROWSER-005 | Authenticated Core3 route matrix | all 80 `/accounting/*` routes | route content settles at mobile `390x844` with no redirect, blank outlet, page/request error, or horizontal overflow | Node Playwright route matrix, 2026-09-12 | 80/80 pass |
| ACC-BROWSER-006 | Authenticated FormView CRUD and persistence | `/accounting/journals` | admin creates a journal, returns to the list, reloads, and sees the persisted row | Node Playwright authenticated browser check, 2026-09-12 | pass; create and reload both found `QA Browser Journal 20260912`, zero browser errors |
| ACC-BROWSER-007 | Permission boundary | `/accounting/journals` as `fleet@tms.local` | unauthorized user cannot read the Accounting route | Node Playwright authenticated browser check, 2026-09-12 | pass; outlet reports `Requires permission: accounting.read` |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| ACC-QA-001 | Combined accounting run timed out in four tests at Bun's default 5s per-test timeout | 4 timeout reports; each isolated file passed with `--timeout 20000` | explicit timeout command | Full 34-file run passed 90/90 with `--timeout 20000` | fixed |
| ACC-QA-002 | Isolated accounting runner previously failed during global page discovery before listening | `bun run agent:module -- accounting --port=3011`; malformed datasource error | global catalog/runtime state is now loadable | port 4011 runner and `/api/modules` pass | fixed/retested |
| ACC-QA-003 | Stale runtime blocker in ledger after global catalog became loadable | isolated runner on port 4011 and authenticated Journals route | main-agent host/catalog integration state | `/api/modules` 200; desktop/mobile Journals render cleanly | retested; ledger updated |
| ACC-VIS-001 | Core3 Journals frame did not match Odoo application chrome: missing purple top bar and equivalent menu chrome because the authenticated menu catalog was cached empty | paired captures plus authenticated DOM probe | `911faa78` documented the smoke matrix; current shell/auth repair is working-tree pending commit | desktop/mobile retest shows plum bar, 6 menu entries, zero errors, and no overflow | fixed/retested; paired visual comparison of toolbar geometry remains open |

## Sign-off

- Functional: focused tests pass when run independently; combined-run policy open
- Permissions: covered by focused accounting tests; authenticated route matrix is clean, boundary interaction retest pending
- Persistence/data integrity: covered by focused mutation tests; browser reload confirmation pending
- Desktop/mobile visual parity: all 80 routes render at both viewports; paired Odoo toolbar/layout comparison remains open
- Tester decision: not signed off; runtime and browser gates remain open

## QA dispatch contract

This ledger is updated by bounded QA events. The main agent dispatches the same
accounting QA slot on `feature-complete`, `merge-candidate`, `post-merge`,
`refactor-impact`, or `release`; the slot exits after recording evidence and
does not remain active while dormant.

## Candidate QA: `9c19f5a4` (2026-09-13)

- Exact checkout: `9c19f5a44c5427a55d550382558032ef9ae65620`; product worktree
  was clean before QA. No product files were changed.
- Focused attachment contract: `bun test
  ./test/accounting_bank_statement_attachments.integration.test.ts
  --timeout 20000` — **1 passed, 11 assertions, 0 failures**. Covers
  read-only upload denial, write upload, restart persistence of metadata and
  storage key, optimistic row-version guard, and byte-accurate CSV download.
- Static gates: `bun run audit` passed (659 pages, 668 routes, 1,140
  datasources); `git diff --check 9c19f5a4^ 9c19f5a4` passed. No `lint` script
  exists (`error: Script not found "lint"`), so no lint result is claimed.
- Full regression `bun test ./test/accounting*.integration.test.ts --timeout
  20000` was started but hung before Bun's summary and was terminated. No
  full-regression sign-off is claimed.
- Authenticated Core3 browser attempt used the isolated runner on port 4339,
  `admin@tms.local`, desktop `1440x900`, and mobile `390x844`. After a
  frontend rebuild, the list/detail route had zero page errors, failed
  requests, or horizontal overflow. Captures outside Git:
  `/tmp/core3-odoo-parity/accounting-bank-statement-attachments-20260913/`
  (`desktop-initial.png`, `mobile-initial.png`, `mobile-uploaded.png`). The
  mobile detail exposed the file input, but upload/download persistence was
  not verified end-to-end and desktop detail interaction was unreliable.
- Odoo `/web/login` returned HTTP 200, but no fresh authenticated paired
  bank-statement attachment comparison or captures were completed. Existing
  Odoo captures do not prove this candidate slice.
- Decision: **not signed off**. Browser upload/download, completed combined
  regression, lint-equivalent check, and paired authenticated Odoo evidence
  remain open.
