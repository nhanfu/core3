# order QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/order-desktop.png and order-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA slot: wave-1 order assignment
Module owner: order module owner
Verification trigger: merge-candidate
Candidate commit: ef85c2a7
QA state: qa-in-progress

## QA-5 candidate verification: `a284eb78` (2026-09-13)

- Candidate under test: `feat(order): add bulk invoice creation action` at
  `a284eb78`.
- Exact bounded suite: `bun test ./test/sales_orders_to_invoice.integration.test.ts
  --timeout 120000` — **3 passed, 18 assertions, 0 failures** in 26.02s.
- Sales regression: `bun test ./test/sales*.integration.test.ts --timeout
  120000` — **21 passed, 191 assertions, 0 failures** across 8 files in 99.14s.
- Authenticated desktop browser (`1440x900`, admin demo actor): `/order/to-invoice`
  rendered 256 rows; two rows were selected, the native confirmation displayed
  `Create invoices for  selected orders?`, and the confirmed request to
  `/api/mutate` returned HTTP 200. There were 0 console errors and 0 page errors.
- Existing authenticated route-smoke evidence covers mobile (`390x844`) with no
  blank/redirect, request/page errors, or horizontal overflow; a fresh mobile
  bulk-action interaction was not run in this event.
- Permission boundary: unauthenticated `/api/pages/sale-to-invoice` returned
  HTTP 401; unauthenticated `/api/mutate` returned HTTP 401. The seeded Fleet
  actor is a dispatcher with `orders.read` and `orders.write`, so it is not a
  valid negative actor for this action.
- Cross-module finding `ORDER-QA-003`: the candidate bulk mutation inserts
  `sale_invoices` only and does not call `accounting.invoices.create_from_source`
  or populate `accounting_invoice_id`; Accounting-side invoice creation/linkage
  is therefore not proven and remains open.
- No product code was changed by QA-5. This worktree contains only this QA
  ledger update and the existing candidate files.

Detailed execution matrix: [`test-plans/order.md`](test-plans/order.md). The
module-scoped Sales suite passes; the remaining failure is repository-wide
discovery of datasource contracts outside Order ownership.

## Test cases

## QA-6 candidate verification: `61422c4e` (2026-09-13)

- Candidate under test: `fix(order): link bulk invoices through accounting service` at `61422c4e`.
- Focused bounded suite: `bun test ./test/sales_orders_to_invoice.integration.test.ts --timeout 120000`. All 4 tests passed when run as the complete case set: declaration/permission, Accounting-linked draft creation with duplicate and empty-selection guards, mixed-branch/already-invoiced atomic rejection, and Accounting rejection rollback with stale guard. The focused assertions cover `accounting.invoices.create_from_source`, persisted `sale_invoices.accounting_invoice_id`, source metadata, no partial local writes, `orders.write`, branch scope, duplicate protection, and stale-selection contract.
- Sales regression probe: `bun test ./test/sales*.integration.test.ts --timeout 120000` was intentionally stopped after it remained active. Before termination, 12 Sales tests had passed: customer report 3, order detail 4, Orders to Invoice 4, and Orders to Upsell 1. No final regression summary is claimed.
- Audit: `bun run audit` passed — 659 pages, 668 routes, 1139 datasources.
- Diff check: `git diff --check HEAD^ HEAD` passed with no output.
- Lint: targeted `bunx eslint services/order/api/sale-to-invoice.yaml test/sales_orders_to_invoice.integration.test.ts ../packages/server/src/yaml-mutation-runtime.ts` returned no lint errors; ESLint emitted one warning that the YAML file is ignored because no configuration matches it.
- Product code was not changed by QA. Only this ledger and `progress/order.md` are changed for the QA commit.
- Browser/restart/reference boundary: no authenticated Core3 browser session was available for this bounded run, so fresh desktop/mobile interaction, restricted actor, reload/restart persistence, and paired Odoo captures were not executed. Existing desktop evidence is from the predecessor candidate and is not retested evidence for `61422c4e`; no new captures are claimed.

| Test ID | Odoo action/route | Core3 route | Functional scenario/state | Evidence | Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| ORDER-FUNC-001 | `sale.action_quotations` / `sale.action_orders` | `/order/quotations`, `/order/sales-orders` | Read populated orders, open the Sales order form, and exercise draft → sent → confirmed → cancelled transitions with row-version guards | `bun test test/sales_order_detail.integration.test.ts` — 4 tests, 32 assertions | pass | 2026-09-12 |
| ORDER-FUNC-002 | `sale.action_orders_upselling` | `/order/orders-to-upsell` | Query deterministic upsell row, search-empty, branch scope, explicit empty state, and transport error | `bun test test/sales_orders_to_upsell.integration.test.ts` — 2 tests, 15 assertions | pass | 2026-09-12 |
| ORDER-FUNC-009 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Select approved orders and create draft invoices atomically; refresh the queue state and reject empty, duplicate, already-invoiced, or out-of-scope selections | `bun test test/sales_orders_to_invoice.integration.test.ts` — 3 tests, 18 assertions | pass | 2026-09-13 |
| ORDER-QA-006 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Candidate `61422c4e`: Accounting source creation/linkage, rollback, duplicate/branch/stale/permission guards, and bounded Sales regression | Focused case set 4/4 pass; audit 659/668/1139; diff check clean; Sales glob stopped after 12 passes | pass (bounded contract/static); browser gates open | 2026-09-13 |
| ORDER-QA-005 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Authenticated desktop selection, confirmation, mutation response, and browser error boundary | `/tmp/order-qa-bulk-invoice-desktop.png`; 2 selected; `/api/mutate` HTTP 200; 0 console/page errors | pass (desktop) | 2026-09-13 |
| ORDER-FUNC-003 | `sale.mail_template_menu` / `sale_order_template_action` | `/order/quotation-templates` | Read, create, duplicate-reject, validate, edit, stale-write reject, line-create, and missing-template guards | `bun test test/sales_quotation_templates.integration.test.ts` — 2 tests, 21 assertions | pass | 2026-09-12 |
| ORDER-CONTRACT-001 | Sales reporting customer/salesperson actions | `/order/reporting/customers`, `/order/reporting/salespersons` | Validate page/API binding and graph/pivot/search/date contracts | Sales-focused suite passes; `bun run audit` passes with 648 pages, 663 routes, and 1113 datasources | pass | 2026-09-12 |
| ORDER-BROWSER-001 | Sales menus and order form | `/order/quotations`, `/order/sales-orders`, `/order/orders-to-upsell` | Authenticated desktop/mobile navigation, CRUD/workflow interaction, reload persistence, and overflow check | No capture; required persistent `js_repl` browser surface unavailable | blocked | 2026-09-12 |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| ORDER-QA-001 | Customer and salesperson report tests failed when `discoverPages()` validated the full sample; invalid datasource error was recorded as outside Order ownership | `bun run audit` now passes; Sales-focused suite also passes 18/18 | — | Retested in `sdk/bun/sample`; no current discovery defect | fixed |
| ORDER-QA-002 | Authenticated visual/browser verification could not start because persistent `js_repl` is unavailable in this session | Skill precondition failure; no browser artifact claimed | — | Re-run from browser-capable QA session | open |
| ORDER-QA-003 | Bulk Orders to Invoice does not invoke the Accounting source-invoice service or set `accounting_invoice_id` | `sale-to-invoice.yaml` now iterates selected orders through `yaml.service.accounting` / `accounting.invoices.create_from_source`, then persists the returned ID in `sale_invoices.accounting_invoice_id` | `54f4db20` | `bun test test/sales_orders_to_invoice.integration.test.ts`: 4 tests, 24 assertions; Accounting linkage, failure rollback, permission declaration, duplicate, branch-scope, and stale-selection guards pass | fixed |
| ORDER-QA-004 | Candidate-level authenticated UI, restricted-actor, restart, and paired Odoo evidence is unavailable in this bounded run | No Playwright/Odoo probe was started; predecessor desktop evidence is explicitly not reused as candidate retest evidence | — | Re-run with authenticated Core3 and Odoo sessions, desktop/mobile captures, restricted actor, and restart persistence check | open |

## Sign-off

- Functional: bounded contract/static verification passes; Sales regression probe was interrupted after 12 passes
- Permissions: contract coverage present; authenticated restricted-user browser check pending
- Persistence/data integrity: Accounting linkage and rollback pass in isolated tests; candidate browser reload/restart persistence pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off; repository-wide discovery and browser evidence remain open
