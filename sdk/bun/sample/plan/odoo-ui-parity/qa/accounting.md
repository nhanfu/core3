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
Candidate commit: `35e618aa776b90e97f3c59a092114b3c7997e39f`
QA state: qa-in-progress

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
| ACC-BROWSER-001 | Authenticated Odoo/Core3 reference | `/accounting/journals` | desktop authenticated render, seeded rows, no browser errors, overflow check | paired captures: `/tmp/core3-odoo-parity/accounting-paired/odoo-desktop.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-desktop.png`; shell retest: `/tmp/core3-odoo-parity/accounting-paired/core3-desktop-shell-fixed.png` | functional pass; shell/auth menu mismatch fixed, toolbar comparison remains open |
| ACC-BROWSER-002 | Authenticated Odoo/Core3 reference | `/accounting/journals` | mobile authenticated render, seeded rows, no browser errors, overflow check | paired captures: `/tmp/core3-odoo-parity/accounting-paired/odoo-mobile.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-mobile.png`; shell retest: `/tmp/core3-odoo-parity/accounting-paired/core3-mobile-shell-fixed.png` | functional pass; shell/auth menu mismatch fixed, toolbar comparison remains open |
| ACC-RUNTIME-001 | Core3 module runner | accounting process | startup and zero unexpected API failures | `bun run agent:module -- accounting --port=4011`; `/api/modules` returned 200 | fixed/retested |
| ACC-BROWSER-003 | Authenticated shell after login | `/accounting/journals` | menu catalog is loaded after authentication; Odoo-style shell chrome is visible at desktop and mobile | Node Playwright authenticated checks; `/tmp/core3-odoo-parity/accounting-paired/core3-desktop-shell-fixed.png`, `/tmp/core3-odoo-parity/accounting-paired/core3-mobile-shell-fixed.png` | pass; 0 page/request errors, no horizontal overflow, 6 visible top-level menu entries |
| ACC-BROWSER-004 | Authenticated Core3 route matrix | all 80 `/accounting/*` routes | route content settles at desktop `1440x900` with no redirect, blank outlet, page/request error, or horizontal overflow | Node Playwright route matrix, 2026-09-12 | 80/80 pass |
| ACC-BROWSER-005 | Authenticated Core3 route matrix | all 80 `/accounting/*` routes | route content settles at mobile `390x844` with no redirect, blank outlet, page/request error, or horizontal overflow | Node Playwright route matrix, 2026-09-12 | 80/80 pass |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| ACC-QA-001 | Combined accounting run timed out in four tests at Bun's default 5s per-test timeout | 4 timeout reports; each isolated file passed with `--timeout 20000` | none; test/runtime policy follow-up | isolated retests pass | open |
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
