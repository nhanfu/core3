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

Detailed execution matrix: [`test-plans/order.md`](test-plans/order.md). The
module-scoped Sales suite passes; the remaining failure is repository-wide
discovery of datasource contracts outside Order ownership.

## Test cases

| Test ID | Odoo action/route | Core3 route | Functional scenario/state | Evidence | Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| ORDER-FUNC-001 | `sale.action_quotations` / `sale.action_orders` | `/order/quotations`, `/order/sales-orders` | Read populated orders, open the Sales order form, and exercise draft → sent → confirmed → cancelled transitions with row-version guards | `bun test test/sales_order_detail.integration.test.ts` — 4 tests, 32 assertions | pass | 2026-09-12 |
| ORDER-FUNC-002 | `sale.action_orders_upselling` | `/order/orders-to-upsell` | Query deterministic upsell row, search-empty, branch scope, explicit empty state, and transport error | `bun test test/sales_orders_to_upsell.integration.test.ts` — 2 tests, 15 assertions | pass | 2026-09-12 |
| ORDER-FUNC-009 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Select approved orders and create draft invoices atomically; refresh the queue state and reject empty, duplicate, already-invoiced, or out-of-scope selections | `bun test test/sales_orders_to_invoice.integration.test.ts` — 3 tests, 18 assertions | pass | 2026-09-13 |
| ORDER-FUNC-003 | `sale.mail_template_menu` / `sale_order_template_action` | `/order/quotation-templates` | Read, create, duplicate-reject, validate, edit, stale-write reject, line-create, and missing-template guards | `bun test test/sales_quotation_templates.integration.test.ts` — 2 tests, 21 assertions | pass | 2026-09-12 |
| ORDER-CONTRACT-001 | Sales reporting customer/salesperson actions | `/order/reporting/customers`, `/order/reporting/salespersons` | Validate page/API binding and graph/pivot/search/date contracts | Sales-focused suite passes; `bun run audit` passes with 648 pages, 663 routes, and 1113 datasources | pass | 2026-09-12 |
| ORDER-BROWSER-001 | Sales menus and order form | `/order/quotations`, `/order/sales-orders`, `/order/orders-to-upsell` | Authenticated desktop/mobile navigation, CRUD/workflow interaction, reload persistence, and overflow check | No capture; required persistent `js_repl` browser surface unavailable | blocked | 2026-09-12 |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| ORDER-QA-001 | Customer and salesperson report tests failed when `discoverPages()` validated the full sample; invalid datasource error was recorded as outside Order ownership | `bun run audit` now passes; Sales-focused suite also passes 18/18 | — | Retested in `sdk/bun/sample`; no current discovery defect | fixed |
| ORDER-QA-002 | Authenticated visual/browser verification could not start because persistent `js_repl` is unavailable in this session | Skill precondition failure; no browser artifact claimed | — | Re-run from browser-capable QA session | open |

## Sign-off

- Functional: partial; focused bounded slices pass
- Permissions: contract coverage present; authenticated restricted-user browser check pending
- Persistence/data integrity: order form and migration-backed mutation checks pass; browser reload check pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off; repository-wide discovery and browser evidence remain open
