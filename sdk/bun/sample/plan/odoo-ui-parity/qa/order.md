# order QA ledger

QA slot: wave-1 order assignment
Module owner: order module owner
Verification trigger: merge-candidate
Candidate commit: pending
QA state: qa-failed

## Test cases

| Test ID | Odoo action/route | Core3 route | Functional scenario/state | Evidence | Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| ORDER-FUNC-001 | `sale.action_quotations` / `sale.action_orders` | `/order/quotations`, `/order/sales-orders` | Read populated orders, open the Sales order form, and exercise draft → sent → confirmed → cancelled transitions with row-version guards | `bun test test/sales_order_detail.integration.test.ts` — 4 tests, 32 assertions | pass | 2026-09-12 |
| ORDER-FUNC-002 | `sale.action_orders_upselling` | `/order/orders-to-upsell` | Query deterministic upsell row, search-empty, branch scope, explicit empty state, and transport error | `bun test test/sales_orders_to_upsell.integration.test.ts` — 2 tests, 15 assertions | pass | 2026-09-12 |
| ORDER-FUNC-003 | `sale.mail_template_menu` / `sale_order_template_action` | `/order/quotation-templates` | Read, create, duplicate-reject, validate, edit, stale-write reject, line-create, and missing-template guards | `bun test test/sales_quotation_templates.integration.test.ts` — 2 tests, 21 assertions | pass | 2026-09-12 |
| ORDER-CONTRACT-001 | Sales reporting customer/salesperson actions | `/order/reporting/customers`, `/order/reporting/salespersons` | Validate page/API binding and graph/pivot/search/date contracts | `bun test` output: contract tests pass, repository-wide discovery fails on unrelated invalid datasources | blocked | 2026-09-12 |
| ORDER-BROWSER-001 | Sales menus and order form | `/order/quotations`, `/order/sales-orders`, `/order/orders-to-upsell` | Authenticated desktop/mobile navigation, CRUD/workflow interaction, reload persistence, and overflow check | No capture; required persistent `js_repl` browser surface unavailable | blocked | 2026-09-12 |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| ORDER-QA-001 | Customer and salesperson report tests fail when `discoverPages()` validates the full sample; error reports `datasources[1..3]` without query/data/mock/workflow definition | `bun test test/sales_customer_report.integration.test.ts` and combined focused run | — | Order-only YAML validation passes; source is outside order ownership and needs main-agent triage | open |
| ORDER-QA-002 | Authenticated visual/browser verification could not start because persistent `js_repl` is unavailable in this session | Skill precondition failure; no browser artifact claimed | — | Re-run from browser-capable QA session | open |

## Sign-off

- Functional: partial; focused bounded slices pass
- Permissions: contract coverage present; authenticated restricted-user browser check pending
- Persistence/data integrity: order form and migration-backed mutation checks pass; browser reload check pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off; repository-wide discovery and browser evidence remain open
