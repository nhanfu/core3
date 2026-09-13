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
| ACC-FUNC-009-JI-RETEST | Journal Items export repair | `/accounting/journal-items` | Shared export anchor lifecycle and four-row desktop/mobile surface | `99a8f86f`; browser download event not independently captured | conditional; XLSX artifact/event and broader export gates remain open |
| ACC-BROWSER-001 | Authenticated Odoo/Core3 reference | `/accounting/journals` | desktop authenticated render, seeded rows, no browser errors, overflow check | paired captures: `/tmp/core3-odoo-parity/accounting-paired/odoo-desktop.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-desktop.png`; shell retest: `/tmp/core3-odoo-parity/accounting-paired/core3-desktop-shell-fixed.png` | functional pass; shell/auth menu mismatch fixed, toolbar comparison remains open |
| ACC-BROWSER-002 | Authenticated Odoo/Core3 reference | `/accounting/journals` | mobile authenticated render, seeded rows, no browser errors, overflow check | paired captures: `/tmp/core3-odoo-parity/accounting-paired/odoo-mobile.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-mobile.png`; shell retest: `/tmp/core3-odoo-parity/accounting-paired/core3-mobile-shell-fixed.png` | functional pass; shell/auth menu mismatch fixed, toolbar comparison remains open |
| ACC-RUNTIME-001 | Core3 module runner | accounting process | startup and zero unexpected API failures | `bun run agent:module -- accounting --port=4011`; `/api/modules` returned 200 | fixed/retested |
| ACC-BROWSER-003 | Authenticated shell after login | `/accounting/journals` | menu catalog is loaded after authentication; Odoo-style shell chrome is visible at desktop and mobile | Node Playwright authenticated checks; `/tmp/core3-odoo-parity/accounting-paired/core3-desktop-shell-fixed.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-mobile-shell-fixed.png` | pass; 0 page/request errors, no horizontal overflow, 6 visible top-level menu entries |
| ACC-BROWSER-004 | Authenticated Core3 route matrix | all 80 `/accounting/*` routes | route content settles at desktop `1440x900` with no redirect, blank outlet, page/request error, or horizontal overflow | Node Playwright route matrix, 2026-09-12 | 80/80 pass |
| ACC-BROWSER-005 | Authenticated Core3 route matrix | all 80 `/accounting/*` routes | route content settles at mobile `390x844` with no redirect, blank outlet, page/request error, or horizontal overflow | Node Playwright route matrix, 2026-09-12 | 80/80 pass |
| ACC-BROWSER-006 | Authenticated FormView CRUD and persistence | `/accounting/journals` | admin creates a journal, returns to the list, reloads, and sees the persisted row | Node Playwright authenticated browser check, 2026-09-12 | pass; create and reload both found `QA Browser Journal 20260912`, zero browser errors |
| ACC-BROWSER-007 | Permission boundary | `/accounting/journals` as `fleet@tms.local` | unauthorized user cannot read the Accounting route | Node Playwright authenticated browser check, 2026-09-12 | pass; outlet reports `Requires permission: accounting.read` |

## R2 dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-ACCOUNTING-CONFIG-WAVE-20260913-R2` → `QA-ACCOUNTING-CONFIG-WAVE-20260913-R2` | existing `agent/odoo-ui-accounting-config` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-accounting-config` | Payment-terms/configuration page/API binding, CRUD validation, company/role boundaries, stale/missing guards, and focused no-partial-write tests | dispatched in `3326062b`; awaiting self-contained product commit before QA |

| `DEV-ACCOUNTING-VISUAL-WAVE-20260913-R2` → `QA-ACCOUNTING-VISUAL-WAVE-20260913-R2` | existing `agent/odoo-ui-accounting-visual2-20260912` in `/home/nhanjs/projects/core3-worktrees/accounting-visual2-20260912` | Bank-statement attachment upload/download binding, metadata/byte persistence, company/role permissions, stale/missing/invalid guards, and focused atomicity tests | dispatched in `74e4cdbd`; awaiting self-contained product commit before QA |

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

## Journal Items export retest (2026-09-13)

- Trigger: `merge-candidate` bounded accounting owner repair.
- Runtime: isolated `bun run agent:module -- accounting --port=4011`.
- Browser: authenticated Chrome, 1440x900 and 390x844; opened Columns and
  clicked the visible Journal Items Export utility action.
- Result: both downloads were named `accounting-journal-items-export.xlsx`,
  4,453 bytes, began with `504b0304`, and had four deterministic rows; zero
  page/request errors and no horizontal overflow.
- Repair: DOM-attached download anchor with deferred object-URL cleanup.
- Scope: Journal Items export only; broader Accounting export/attachment/print
  behavior remains outside this event.

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

## Reviewer disposition — candidate `99a8f86f`

- Integrated on the active branch as `3e047bd7`; scope is limited to shared
  CSV/XLSX download-anchor lifecycle behavior and the Journal Items export
  client regression.
- Post-merge verification passed: client Vitest export tests, Accounting
  Journal Items contract tests, full merged Accounting suite (91 tests / 1,024
  assertions), UI audit, Sass build, targeted checks, and `git diff --check`.
- The candidate's authenticated desktop/mobile Journal Items rendering and
  four-row/no-overflow evidence is preserved. The XLSX browser download event
  was not independently captured in this review, so that remains conditional.
- Broader export, attachment, print, and paired Odoo gates remain open;
  Accounting is unsigned-off.
## Bounded QA event: Journal Items export candidate `99a8f86f` (2026-09-13)

- Scope: exactly candidate `99a8f86f` in
  `/home/nhanjs/projects/core3-worktrees/odoo-accounting-journal-items-export`.
  No implementation files or aggregate `progress.md` were changed by this QA
  event.
- Runtime: the existing isolated Accounting runner on port `4011` remained
  active throughout; `/api/modules` returned 200. No replacement runner was
  started.
- Focused gates: `accounting_journal_items_views.integration.test.ts` passed
  2/2; the client `list-utils` regression passed 3/3; attachment component
  coverage passed 31/31. The full Accounting suite passed 90/90 tests and
  1,013 assertions across 34 files with `--timeout 20000`.
- Static/build gates: `bun run audit` passed (659 pages, 669 routes, 1,134
  datasources); targeted ESLint passed for `list-utils.ts`, `xlsx-utils.ts`,
  and its regression test; `bun run frontend:build` passed; `git diff --check`
  passed. The deferred cleanup assertion confirms the DOM anchor remains
  attached through click and the object URL is revoked on the next tick.
- Authenticated browser: Admin login reached `/accounting/journal-items` at
  1440x900 and 390x844. Four deterministic Journal Items rows rendered on
  desktop and the corresponding responsive card data rendered on mobile; both
  viewports had no horizontal overflow or page errors. The real
  `accounting.journal_items.export` Export control was present and clickable.
- Download retest: authenticated Chrome emitted the Journal Items download on
  both desktop and mobile; `accounting-journal-items-export.xlsx` was 4,453
  bytes with signature `504b0304` and four deterministic rows. The browser
  download blocker is closed for Journal Items.
- Broader gates: Accounting-wide export, attachment download/upload, print,
  and paired Odoo toolbar/layout comparison remain open; the passing
  attachment component tests do not replace those browser gates. Permission
  contract coverage remains passing (`accounting.read` on the export action),
  while a fresh Fleet-user browser export-denial probe was not completed in
  this bounded event.

Reviewer handoff: retain the broader export/attachment/print/Odoo gates
explicitly. Journal Items export is browser-verified; this repair wave adds
Sales and Purchases export coverage below.

## Bounded QA event: Payment Terms candidate `b98f9e80` (2026-09-13)

- Candidate checkout: `b98f9e801995c6dd5308661b72209356af638cb5` in the paired
  developer worktree `/home/nhanjs/projects/core3-worktrees/odoo-ui-accounting-payment-transactions-20260910`.
  The worktree was clean before and after QA. No implementation files or
  `progress.md` were changed; screenshots remain outside Git under `/tmp`.
- Focused contract suite: `bun test
  ./sdk/bun/sample/test/accounting_payment_terms.integration.test.ts
  --timeout 20000` — **3 passed, 47 assertions, 0 failures**. This covers
  page/detail binding, deterministic list/detail/search/empty/not-found/
  transport states, write permissions, company-aware CRUD, validation,
  stale/missing guards, and atomic rejection.
- Accounting regression suite: from `sdk/bun/sample`, `bun test
  ./test/accounting_*.integration.test.ts --timeout 20000` — **44 passed,
  578 assertions, 0 failures across 15 files**.
- Static checks: `bun run audit` — **404 pages, 410 routes, 708 datasources,
  passed**; `git diff --check HEAD^ HEAD` passed; the candidate worktree
  remained clean. The repository has no lint script in this checkout, so no
  lint result is claimed.
- Runtime: started the exact paired checkout with
  `PORT=4339 bun scripts/dev.ts --db=ddb --memory`; `/api/modules` returned
  HTTP 200. The runner required the existing event mediator and used port
  3011 because port 3010 was occupied.
- Authenticated browser: admin `admin@tms.local` on Core3 at `http://localhost:3002`,
  desktop `1440x900` and mobile `390x844`. The Payment Terms list rendered
  eight seeded rows; the Immediate Payment row opened the bound detail route
  `/accounting/payment-term-detail?id=immediate`, with Edit/Archive/Delete
  actions. Mobile had no horizontal overflow and zero console errors. The
  empty-result search interaction was not conclusively exercised because
  filling the search field alone did not submit the query.
- Browser CRUD finding: **fail**. Admin opened New and entered a valid term,
  but Save returned HTTP 500 and left the modal open: `Conversion Error: Could
  not convert string '' to BOOL`. The submitted payload contained
  `early_discount: ""`; no created row or persistence/reload evidence exists.
  Retrying with normal checkbox input still submitted the empty value.
  Evidence: `/tmp/accounting-payment-terms-browser-create.png` and request /
  console capture from the bounded run.
- Permission boundary: **pass**. `fleet@tms.local` received `Requires
  permission: accounting.read` and no Accounting rows rendered.
- Browser artifacts: `/tmp/accounting-payment-terms-login.png`,
  `/tmp/accounting-payment-terms-admin-detail.png`,
  `/tmp/accounting-payment-terms-mobile.png`, and
  `/tmp/accounting-payment-terms-browser-create.png`; all are outside Git.
- Odoo comparison: not run in this bounded event; no fresh authenticated Odoo
  Payment Terms comparison was available.

### Bounded verdict — **FAIL / not ready for reviewer reconciliation**

Contract and regression tests pass, but authenticated admin create is broken
by the empty boolean serialization and therefore persistence, edit, archive,
restore, delete, and browser CRUD sign-off are withheld. The developer must
normalize unchecked boolean form values (including `early_discount`) before a
new `merge-candidate` QA event. Broader paired Odoo comparison and full
Accounting export/attachment/print gates also remain open.

## Bounded QA event: Sales and Purchases exports (2026-09-13)

- Trigger: `merge-candidate` Accounting repair wave.
- Runtime: existing isolated Accounting runner on port `4011`; `/api/modules`
  returned 200.
- Contract: Sales and Purchases page/API actions are both `accounting.read`
  guarded and their focused tests passed 4/4.
- Browser: authenticated Chrome opened the Columns utility menu and clicked
  Export at 1440x900 and 390x844 for both `/accounting/sales` and
  `/accounting/purchases`.
- Evidence: Sales files were `accounting-sales-export.xlsx` (3,578 bytes) and
  Purchases files were `accounting-purchases-export.xlsx` (3,585 bytes); all
  had signature `504b0304`, expected two rows, zero page/request errors, and
  no horizontal overflow. Downloads remain under `/tmp`.
- Scope: Sales and Purchases export only; broader Accounting attachment,
  print, and paired Odoo comparison gates remain open.

## 2026-09-13 coordinator review: candidate `94a4703f`

- Integrated the bounded Sales/Purchases journal-item export actions and
  contract tests as `f43694ba`. Candidate-side Accounting plan/progress/QA
  documentation was reconciled with the active ledger; no unrelated product
  changes were imported.
- Post-merge focused Sales/Purchases tests passed **4 tests, 29 assertions**.
  Candidate evidence remains **90 tests, 1,017 assertions**, with YAML/API/
  permission contracts, audit (**661 pages, 670 routes, 1154 datasources**),
  ESLint, build, diff-check, and authenticated Chrome desktop/mobile XLSX
  downloads passing.
- Accounting remains **conditional / unsigned-off**. Broader attachment,
  print, and authenticated paired Odoo comparison gates remain open.
## 2026-09-13 coordinator dispatch — bounded reconciliation wave

- Existing owner `agent/odoo-accounting-bank-statement-attachments-20260913` is
  assigned on `/home/nhanjs/projects/core3-worktrees/odoo-accounting-bank-
  statement-attachments-20260913`, based at `f0024c0f`. Development event:
  `DEV-ACCOUNTING-WAVE-20260913-R2`; QA event:
  `QA-ACCOUNTING-WAVE-20260913-R2`; handoff commit: `97f1529b`.
- Scope is atomic bank-statement reconciliation/unreconciliation with linked
  balance/payment/journal updates, duplicate/stale/invalid/scope guards, and
  focused no-partial-write tests. Candidate pending; ledgers and aggregate
  progress are preserved.

## 2026-09-13 coordinator dispatch — Payment Terms R2

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-ACCOUNTING-PAYMENT-TERMS-WAVE-20260913-R2` → `QA-ACCOUNTING-PAYMENT-TERMS-WAVE-20260913-R2` | existing `agent/odoo-ui-accounting-payment-transactions-20260910` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-accounting-payment-transactions-20260910` | Payment Terms page/API binding, CRUD validation, manager/company permissions, stale/missing guards, and focused atomicity tests | dispatched in `e845b30f`; awaiting self-contained product commit before QA |

Lifecycle decision: **stalled** after repeated unchanged polls and escalation
`a8a6bf33`; handoff status recorded in `e3bea965`. Partial Payment Terms files
remain preserved; QA was not triggered.

## Bounded QA retest: active-contract Payment Terms repair `114e2c0b` (2026-09-13)

- Candidate checkout: `114e2c0bcb4ec42e9269d6530eb0628250d599b8` in the existing
  paired worktree `/home/nhanjs/projects/core3-worktrees/odoo-ui-accounting-payment-transactions-20260910`.
  The worktree was clean before and after QA. No implementation files or
  `progress.md` were changed; no screenshots were created because the browser
  runtime was unavailable.
- Focused suite: `bun test ./test/accounting_payment_terms.integration.test.ts
  --timeout 20000` from `sdk/bun/sample` — **3 passed, 48 assertions, 0
  failures**. This covers page/detail binding, deterministic list/detail,
  search/empty/detail/transport states, write permissions, company-aware CRUD,
  validation, missing/stale guards, atomic rejection, and the repaired blank
  boolean contract.
- Full Accounting suite: `bun test ./test/accounting_*.integration.test.ts
  --timeout 20000` — **91 passed, 1,033 assertions, 0 failures across 35
  files**. The first observation exceeded 30 seconds; the same confirmed test
  process was bounded and re-polled, then completed in 45.39 seconds.
- Static evidence: `bun run audit` — **661 pages, 670 routes, 1,154
  datasources, passed**; `git diff --check HEAD^ HEAD` passed; candidate
  worktree remained clean. No lint script exists in this checkout, so lint is
  not claimed.
- Runtime/browser blocker: no listener was available on the exact existing
  runner ports `4339`, `3002`, or mediator `3010` when the browser retest was
  attempted. Therefore authenticated admin create with blank `early_discount`,
  browser persistence/CRUD lifecycle, browser permission boundary, viewport
  fit, and fresh browser evidence for this commit are **unverified**. The
  prior `5914d094` browser pass is not reused as proof for `114e2c0b`.
- Odoo comparison: not run; paired authenticated Odoo evidence remains open.

## Final browser retest: integrated Payment Terms `b54a6a66` / Events `ab5496ba` (2026-09-13)

- Runtime attribution: active checkout `bc584a84` contains both
  `b54a6a66` and `ab5496ba`; backend `127.0.0.1:3001/api/modules` and
  frontend `localhost:3002` were live with mediator 3010 listening. No
  implementation or `progress.md` files were changed.
- Admin browser at `1440x900` used role/label/state-based locators. Create
  with blank `early_discount` returned HTTP 200 and no console errors, but a
  fresh list navigation did not contain the created row (`persisted=false`).
  The detail route opened and edit/save returned HTTP 200, but the detail
  rendered `Status —` rather than `Status Active`.
- Post-edit action inspection: role-based Archive count was **0**. DOM/action
  inspection exposed only `Edit` and `Delete`; no Archive button,
  `data-action`, `data-mutation`, or titled Archive control was present.
  Consequently archive, archived-state verification, restore, and delete
  lifecycle proof could not be completed. Mutation statuses observed before
  the blocked action were `[200, 200]`; no HTTP 500 or console error occurred.
- Mobile Admin at `390x844` loaded the Payment Terms list with zero console
  errors and no horizontal overflow. Screenshot: outside Git at
  `/tmp/accounting-payment-terms-b54a6a66-mobile.png`.
- Fleet browser permission check returned HTTP 403 with visible
  `Requires permission: accounting.read`; no Accounting list rendered.
- Existing functional evidence for the integrated repair remains focused **3
  tests / 48 assertions**, full Accounting **91 tests / 1,033 assertions**,
  and audit **661 pages / 670 routes / 1,154 datasources**. Those suites cover
  guards, permissions, validation, stale/missing, and atomicity contracts but
  do not override the browser persistence/status/action failures.
- Odoo `http://127.0.0.1:8069/web/login` returned HTTP 200, but the available
  `admin/admin` credentials were rejected (`Wrong login/password`), so paired
  authenticated Odoo comparison was not possible.

### Bounded verdict — **FAIL / not ready for reviewer reconciliation**

Blank create avoids the prior BOOL/500 failure, but candidate browser
persistence is not demonstrated, state is not Active after edit, and the
Archive action is absent. Archive/restore/delete, paired Odoo comparison, and
full candidate browser lifecycle therefore remain failing or unverified.

### Bounded verdict — **CONDITIONAL FAIL / not ready for reviewer reconciliation**

All available functional, full-regression, audit, and clean-worktree gates
pass, but this event cannot certify the active-contract repair in the browser
because the exact runtime was unavailable. Remaining gates are a fresh
authenticated browser check of blank-`early_discount` create (no HTTP 500 or
string-to-BOOL error), persistence and CRUD lifecycle, browser permission and
guard behavior, plus paired authenticated Odoo comparison. Re-run the same QA
event when the existing runner is available; no implementation change is
requested from this QA event.

## Browser retry evidence: Payment Terms `114e2c0b` (2026-09-13)

- Live endpoints were reachable: backend `http://127.0.0.1:3001/api/modules`
  returned HTTP 200 and frontend `http://localhost:3002/` returned HTTP 200;
  mediator port 3010 was listening.
- Authenticated Chrome/Playwright retry at desktop `1440x900` loaded
  `http://localhost:3002/accounting/payment-terms` with
  `admin@tms.local`. A new Payment Term was entered while leaving
  `early_discount` blank. Save returned HTTP 200, the row appeared in the
  list, no BOOL conversion/HTTP 500 message appeared, and there were zero
  console/request-failure errors. Screenshot is outside Git at
  `/tmp/accounting-payment-terms-114e2c0b-browser-retry.png`.
- Attribution blocker: the live server process cwd is the primary checkout
  `/home/nhanjs/projects/core3/sdk/bun/sample` at `ab5496ba`; git ancestry
  confirms `114e2c0b` is **not** in that runtime. The retry therefore proves
  the live environment behavior only, not candidate `114e2c0b`. No candidate
  worktree or implementation files were modified.

### Bounded browser verdict — **CONDITIONAL / candidate not certifiable**

Blank-boolean browser behavior passes on the live runtime, but candidate
attribution remains blocked until the same existing process is restarted from
the `114e2c0b` worktree (or the candidate is integrated). Full candidate
browser CRUD persistence, permissions, guards, atomicity, desktop/mobile, and
paired Odoo evidence consequently remain unverified for this event.

## Final candidate-attributed QA event: Payment Terms `ebd29063` from `114e2c0b` (2026-09-13)

- Active runtime attribution: primary checkout `a99adb7a` contains the
  integrated source repair `ebd29063` and Events runtime repair `ab5496ba`;
  backend process cwd is `/home/nhanjs/projects/core3/sdk/bun/sample`.
  Backend `http://127.0.0.1:3001/api/modules` and frontend
  `http://localhost:3002/` both returned HTTP 200; mediator 3010 was
  listening. No implementation or `progress.md` files were changed.
- Authenticated browser blank-boolean retry: admin `admin@tms.local` at
  desktop `1440x900` opened `/accounting/payment-terms`, created a new term
  with `early_discount` left blank, and received HTTP 200. The row appeared
  in the list, no string-to-BOOL/HTTP 500 error appeared, and console/request
  error count was zero. Screenshot remains outside Git at
  `/tmp/accounting-payment-terms-ebd29063-browser-retry.png`.
- Browser lifecycle attempt: create and list persistence were reached, but the
  bounded edit/archive/restore/delete sequence could not be certified. After
  the edit interaction, the detail surface did not expose the expected
  Archive control within the 5-second bound; the run terminated without
  archive/restore/delete proof. This is an exact browser blocker, not a
  functional-test pass. No screenshot or implementation change was made for
  the failed sequence.
- Desktop/mobile and permission browser checks were not completed in this
  final candidate-attributed run. Existing focused contract evidence covers
  guards, permissions, validation, stale/missing behavior, and atomicity; it
  does not replace the missing browser lifecycle evidence.
- Paired authenticated Odoo comparison was not available in this event.

### Bounded verdict — **CONDITIONAL FAIL / not ready for reviewer reconciliation**

Blank `early_discount` browser create is verified against the integrated live
runtime, and prior functional suites remain passing, but authenticated
browser edit/archive/restore/delete, fresh mobile/permission evidence, and
paired Odoo comparison remain open. Re-run the lifecycle with the detail
surface exposing Archive/Restore and complete the desktop/mobile and paired
Odoo gates before reviewer sign-off.

## Bounded QA retest: Payment Terms repair `5914d094` (2026-09-13)

- Candidate checkout: `5914d094a7abb301723b3db5f52669a9fbffbfa4` in the
  existing paired worktree
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-accounting-payment-transactions-20260910`.
  The worktree was clean before and after testing. No implementation files or
  `progress.md` were modified; screenshots remain outside Git under `/tmp`.
- Focused retest: `bun test ./test/accounting_payment_terms.integration.test.ts
  --timeout 20000` from `sdk/bun/sample` — **3 passed, 51 assertions, 0
  failures**. This includes the repaired blank-boolean path plus page/detail
  binding, list/detail/search/empty/not-found/transport states, permissions,
  company-aware CRUD, validation, stale/missing guards, and atomic rejection.
- Full Accounting suite: `bun test ./test/accounting_*.integration.test.ts
  --timeout 20000` — **44 passed, 582 assertions, 0 failures across 15
  files**.
- Static/runtime gates: `bun run audit` — **404 pages, 410 routes, 708
  datasources, passed**; `git diff --check HEAD^ HEAD` passed; candidate
  worktree remained clean. No lint script exists in this checkout, so lint is
  not claimed. The existing module runner started from this worktree with
  `PORT=4339 bun scripts/dev.ts --db=ddb --memory`; `/api/modules` returned
  HTTP 200.
- Authenticated browser: admin `admin@tms.local` on Core3, desktop
  `1440x900`. The exact prior failure was retested by leaving Early Payment
  Discount blank: create returned HTTP 200, no conversion error or console
  error, and the new row appeared in the list. The submitted blank boolean no
  longer caused HTTP 500.
- Browser CRUD/persistence: the created row was opened at the bound detail
  route, edited, reloaded through the list, archived, restored, and deleted.
  Mutation responses were `[200, 200, 200, 200, 404]`; the final 404 was the
  expected missing-detail response after deletion, and the deleted row was
  absent after returning to the list. No unexpected browser errors occurred;
  the expected post-delete 404 is retained as missing-record guard evidence.
- Browser visual/permission evidence: prior authenticated mobile capture and
  no-overflow evidence remain valid for the unchanged renderer; the prior
  Fleet-user boundary returned `Requires permission: accounting.read` with no
  rows. New screenshots are outside Git at
  `/tmp/accounting-payment-terms-repair-create-desktop.png` and
  `/tmp/accounting-payment-terms-repair-archived.png`.
- Odoo comparison: not run in this bounded retest; broader Accounting export,
  attachment, print, and paired Odoo comparison gates remain outside this
  candidate.

### Bounded verdict — **PASS for the Payment Terms repair; ready for reviewer reconciliation**

The prior blank `early_discount` string-to-BOOL failure is fixed, and the
bounded Payment Terms functional/browser lifecycle, guards, permissions,
atomicity, focused suite, full Accounting suite, audit, and clean-worktree
gates pass. Reviewer reconciliation is permitted for this candidate only;
this does not sign off the broader Accounting module gates listed above.

## 2026-09-13 coordinator reconciliation — Payment Terms `b98f9e80` + `5914d094`

- The QA evidence is accepted for the bounded Payment Terms behavior: focused
  `3 tests / 51 assertions`, Accounting regression `44 tests / 582 assertions`,
  audit `404 pages / 410 routes / 708 datasources`, authenticated create/edit/
  persistence/archive/restore/delete, permission and atomicity guards, and the
  blank `early_discount` create path all pass.
- Product integration was **not cherry-picked**. The active branch already
  contains the Payment Terms implementation from the earlier `00501125`
  lineage, and `b98f9e80` is a parallel contract that conflicts in the list/
  detail API and page/test files. Blindly selecting either side would discard
  active fields or guards. The active client already serializes unchecked
  checkbox values; its current focused suite passes `3 tests / 43 assertions`.
- This is a bounded reconciliation of evidence, not a duplicate product merge
  or Accounting module sign-off. Broader export, attachment, print, and fresh
  paired-Odoo comparison gates remain open. The owner worktree and its partial/
  historical files remain preserved.

## 2026-09-13 explicit conflict finding and takeover request

- Active branch verification confirms `PageFormModal` already serializes an
  HTML checkbox through `el.checked`; the authenticated blank-
  `early_discount` browser path is therefore behaviorally covered on active.
- Active `YamlMutationRuntime` has `normalize_empty` but no candidate
  `boolean_fields` support, and the active Payment Terms mutations do not
  declare that safeguard. The candidate-only direct mutation regression
  (`early_discount: ''` and `display_on_invoice: ''` become `false`, while an
  invalid request remains atomic) is not present in the active focused test.
- The full `b98f9e80` product patch remains a conflicting parallel contract,
  not a safe merge. A same-module takeover is requested for the narrow server
  normalization/test gap, rebased onto the active Payment Terms contracts;
  no replacement owner or duplicate implementation is authorized here.
- Reviewer dispatch is currently blocked because no agent orchestration tool is
  available in this session. Broader export/attachment/print/Odoo gates remain
  open and Accounting is not signed off.

## Coordinator integration — narrow repair `114e2c0b`

- The inherited Accounting repair was cherry-picked cleanly as `ebd29063`.
  It is limited to `YamlMutationRuntime` boolean normalization, the active
  Payment Terms create/update declarations, and the direct blank-boolean
  regression test. No Events files or unrelated module ledgers were imported.
- Active focused retest: `bun test
  test/accounting_payment_terms.integration.test.ts --timeout 20000` — **3
  tests / 48 assertions passed**. `git diff --check ebd29063^ ebd29063` passed.
- Candidate QA reports Accounting `91 tests / 1,033 assertions`, audit and
  browser evidence as passing for the bounded repair. That result remains
  **conditional** for review because the candidate worktree lacked the already
  integrated Events repair and could not establish clean runtime attribution;
  my combined local Accounting invocation did not complete a final summary.
- Broader export, attachment, print, and paired Odoo comparison gates remain
  open. This is not Accounting module sign-off.

## Robust browser QA retry: integrated Payment Terms `ebd29063` / source `114e2c0b` (2026-09-13)

- Active checkout `a99adb7a` contains `ebd29063` and `ab5496ba`. Backend
  `127.0.0.1:3001/api/modules` and frontend `localhost:3002` returned HTTP
  200; mediator 3010 was listening. No implementation or `progress.md` files
  were changed.
- Authenticated Admin browser at `1440x900` used semantic `Payment Terms *`
  and `Due Rule` locators, left `early_discount` blank, and created a unique
  term. The mutation returned HTTP 200, the row appeared, a fresh list load
  retained it, and there was no conversion/500 message or console error.
- After state-based edit/save, the detail DOM rendered `Status —` and exposed
  only `Edit` and `Delete`. A DOM/action scan found no Archive button,
  `data-action`, `data-mutation`, or titled Archive control. The expected
  Archive action could not be invoked; archive/restore and the complete
  browser lifecycle are therefore unverified. This is the exact action-DOM
  blocker, not a brittle post-edit selector failure.
- Authenticated Admin mobile at `390x844` loaded with zero console errors and
  no horizontal overflow. Screenshot: outside Git at
  `/tmp/accounting-payment-terms-ebd29063-robust-mobile.png`.
- Authenticated Fleet received HTTP 403 and visible `Requires permission:
  accounting.read`; no Accounting list rendered. The expected 403 was the
  only recorded permission-route error.
- Existing integrated functional evidence remains focused **3 tests / 48
  assertions**, full Accounting **91 tests / 1,033 assertions**, and audit
  **661 pages / 670 routes / 1,154 datasources**. These cover guards,
  atomicity, validation, stale/missing, and permission contracts, but do not
  replace missing Archive/Restore browser evidence. Screenshots remain under
  `/tmp/accounting-payment-terms-ebd29063-create-desktop.png`,
  `/tmp/accounting-payment-terms-robust2-after-edit.png`, and the mobile path
  above.
- Paired authenticated Odoo comparison was unavailable.

### Bounded verdict — **CONDITIONAL FAIL / not ready for reviewer reconciliation**

Blank `early_discount` create, persistence, mobile fit, and Fleet permission
denial pass. The active detail contract returns `Status —` and omits Archive,
so browser archive/restore/delete lifecycle sign-off remains blocked; paired
Odoo comparison and broader Accounting export/attachment/print gates remain
open.

## Coordinator integration: Payment Terms lifecycle repair `cb493662` (2026-09-13)

- Ownership and ancestry are valid: the inherited Accounting owner worktree was
  clean, and `cb493662` was based on the active `114e2c0b` repair lineage. The
  candidate is self-contained in the Payment Terms detail contract and focused
  test; no unrelated module files or ledger changes were imported.
- Cherry-picked onto the active branch as `b54a6a66`. The edit mutation now
  permits only `name`, `company`, `description`, and `early_discount`; the edit
  form no longer declares `state`. Dedicated Archive and Restore actions still
  write `state` with concurrency guards, and the focused test verifies this.
- Post-integration verification: focused Payment Terms **3 tests / 51
  assertions passed**; `bun run audit` passed with **661 pages / 670 routes /
  1,154 datasources**; `git diff --check` passed. Candidate evidence reports
  Accounting **91 tests / 1,036 assertions** and a clean candidate worktree.
- Fresh authenticated browser QA against `b54a6a66` is **blocked** because the
  required persistent `js_repl`/Playwright capability is unavailable in this
  review session. No fresh browser pass is claimed. Paired Odoo comparison and
  broader export, attachment, and print gates remain open.

Bounded disposition: **conditionally integrated; Accounting remains unsigned
off** pending fresh browser evidence and the broader module gates.

## Coordinator reconciliation: Payment Terms create-state repair `66429611` (2026-09-13)

- The candidate is a self-contained same-module change in the Payment Terms
  create API contract and focused integration test. It removes lifecycle
  `state` from create fields while retaining the `Active` mutation default;
  dedicated Archive/Restore actions remain responsible for lifecycle state.
- The active branch already contains the candidate's exact final product files
  through the existing Accounting lineage. Cherry-pick of `66429611` was
  therefore empty and was skipped; no duplicate product commit was created.
- Active verification after reconciliation: focused suite **3 tests / 60
  assertions passed**; `bun run audit` passed with **661 pages / 670 routes /
  1,154 datasources**; candidate-reported full Accounting **91 tests / 1,045
  assertions**, diff-check, and clean candidate worktree are retained as
  evidence.
- This is bounded conditional reconciliation only. Fresh browser and paired
  Odoo evidence, plus broader export, attachment, and print gates, remain open;
  Accounting is not fully signed off.

## Final active-runtime browser event: Payment Terms `b54a6a66` (2026-09-13)

- Active runtime checkout `bc584a84` contains `b54a6a66`, `66429611`, and
  Events `ab5496ba`; backend `127.0.0.1:3001` and frontend `localhost:3002`
  returned HTTP 200, with mediator 3010 listening.
- Admin desktop `1440x900`: blank `early_discount` create returned HTTP 200
  with no BOOL/500 or console error, but the fresh list check reported
  `persisted=false`. Edit/save returned HTTP 200; detail rendered `Status —`,
  not Active. Role-based Archive count was 0, and DOM/action inspection found
  only Edit/Delete and no Archive action metadata. Mutation statuses: `[200,
  200]`. Archive, archived state, Restore, and Delete were not certifiable.
- Admin mobile `390x844` had no horizontal overflow and zero console errors;
  Fleet received HTTP 403 with `Requires permission: accounting.read`.
  Screenshot: `/tmp/accounting-payment-terms-b54a6a66-mobile.png` (outside
  Git). Paired authenticated Odoo comparison was unavailable.
- Existing functional evidence: focused **3 tests / 48 assertions**, full
  Accounting **91 tests / 1,033 assertions**, audit **661 pages / 670 routes /
  1,154 datasources**.

### Bounded verdict — **FAIL / not ready for reviewer reconciliation**

Blank create avoids the BOOL failure, but persistence, Active state, Archive,
Restore, Delete, and paired Odoo gates remain open.

## Final active-runtime browser retest: Payment Terms (2026-09-13)

- Runtime checkout `7948370a` contains the integrated Payment Terms repairs;
  backend `http://127.0.0.1:3001/api/modules` and frontend
  `http://localhost:3002` were live with mediator 3010 listening. No
  implementation or `progress.md` files were changed.
- Admin desktop `1440x900` used role/label/state-based locators and explicit
  waits. Blank `early_discount` create returned HTTP 200 with no conversion,
  HTTP 500, or browser errors. The row was found after a fresh list reload.
- The full lifecycle passed: detail opened; edit/save preserved `Status
  Active`; Archive was present and produced `Status Archived` with Restore;
  Restore returned `Status Active`; Delete confirmation completed and the row
  was absent from the list afterward. The archived-state screenshot is outside
  Git at `/tmp/accounting-payment-current-archived.png`.
- Admin mobile `390x844` had zero console errors and no horizontal overflow;
  screenshot: `/tmp/accounting-payment-current-mobile.png`. Fleet received
  HTTP 403 with `Requires permission: accounting.read` and no list content.
- Existing functional evidence remains focused **3 tests / 48 assertions**,
  full Accounting **91 tests / 1,033 assertions**, and audit **661 pages / 670
  routes / 1,154 datasources**; guards, permissions, validation, stale/missing,
  and atomicity are covered by the suites.
- Odoo `/web/login` was reachable at HTTP 200, but authenticated comparison
  was unavailable because the available credentials were rejected. Broader
  Accounting export, attachment, print, and paired Odoo gates remain open.

### Bounded verdict — **PASS for the Payment Terms slice; ready for reviewer reconciliation**

The requested browser lifecycle and contract gates pass against the current
integrated runtime. This is bounded to Payment Terms and does not constitute
full Accounting module sign-off until the broader export/attachment/print and
paired authenticated Odoo comparisons are completed.

## Reviewer reconciliation: final Payment Terms evidence (2026-09-13)

- Active ownership/history is valid: `b54a6a66` and `66429611` are present on
  the active branch; no duplicate implementation or unrelated module files
  were introduced. Candidate diff-check, clean-worktree, and warning/lint
  evidence are retained.
- Final browser evidence passes the bounded slice: blank `early_discount`
  create/reload, edit preserving Active, Archive to Archived, Restore to
  Active, Delete/list removal, Fleet permission 403, and clean mobile layout.
  Focused QA is **3 tests / 60 assertions**; full Accounting is **91 / 1,045**;
  audit is **661 / 670 / 1,154**.
- Disposition: **bounded PASS/reconciled**. Export, attachment, print, and
  authenticated paired-Odoo comparisons remain open; no full Accounting
sign-off is claimed.

## Reviewer reconciliation: Payment Terms output-scope follow-up `4d0eb4f0` (2026-09-13)

- Odoo source review confirms Payment Terms configuration has no module-specific
  export, attachment, print, or report action. Invoice printing consumes
  payment-term data under invoice/report scope, so no unsupported Payment Terms
  actions were added.
- The valid focused negative-contract test was applied to the active Accounting
  test file. Active verification passes **4 tests / 64 assertions** (higher
  than the candidate's 55 because later active lifecycle assertions remain),
  audit passes **661 pages / 670 routes / 1,154 datasources**, and diff-check
  passes. Candidate clean-worktree and warning evidence are retained.
- Disposition: **bounded evidence reconciled**. Accounting-wide export and
  bank-statement attachment remain separate scopes; invoice printing remains
  invoice/report scope. Broader Accounting sign-off remains open.
