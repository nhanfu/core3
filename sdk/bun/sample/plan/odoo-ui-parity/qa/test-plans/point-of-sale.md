# Point of Sale detailed QA test plan

Module: point-of-sale  
QA owner: point-of-sale-qa  
Developer owner: point-of-sale module owner  
Reference addon/version: point_of_sale, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`point-of-sale.md`](../../point-of-sale.md); executed
evidence is recorded in [`../point-of-sale.md`](../point-of-sale.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Cashier/touch | `/point-of-sale/touch` and session routes | Product search/add, customer, notes, discounts, taxes, payment, receipt and session state |
| Sessions and orders | session, order, payment, sale-line and report routes | Open/close/control sessions, order/payment reads, lifecycle and reporting |
| Products/catalog | products, variants, categories, tags, attributes, pricelists and customer routes | List/form/New CRUD, x2many rows, validation, archive and scoped totals |
| Configuration | POS settings, payment methods, floors/tables, printers, note models and combos | Manager configuration, in-use guards, connection/workflow actions and mobile layouts |

Actors are POS Manager, POS Cashier, ordinary POS user, Fleet ordinary user,
wrong-company user and unauthenticated user. Fixtures must include stable
products, taxes, customers, sessions, orders, tenders, floors/tables, printers,
attributes, pricelists and reports. Mutations use isolated databases and
generated IDs; no test may depend on wall-clock dates or a prior test's rows.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| POS-FUNC-001 | Touch cashier | Load session, search/add products, change quantity/customer/notes and recalculate totals from service data | pass: bounded cashier evidence |
| POS-FUNC-002 | Payments | Tender selection, partial/overpayment validation, payment creation and receipt state persist after reload | pass: bounded payment evidence |
| POS-FUNC-003 | Sessions/orders | Session state controls, order list/detail, payments, sale lines and reports use real scoped datasources | pass at contract level; browser route matrix planned |
| POS-FUNC-004 | Product/catalog CRUD | Products, variants, categories, tags, attributes, values and pricelists support declared CRUD, validation, stale and in-use guards | pass: focused corpus |
| POS-FUNC-005 | Configuration CRUD | Payment methods, configurations, floors/tables, printers, note models and combo choices enforce manager permissions and persistence | pass: focused corpus |
| POS-FUNC-006 | Customers/activity | Create customer, project totals, schedule activity and preserve links to POS-owned records | pass at contract level |
| POS-FUNC-007 | Empty/error/not-found | Every list/form/report has deterministic empty, missing, forbidden and transport-error behavior | pass at contract level |
| POS-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate products, sessions, orders or configuration rows | planned restart/migration gate |
| POS-FUNC-009 | Attachments/import/export/print | Exercise receipts, attachments, product import/export and exposed report/print actions | planned browser interaction gate |
| POS-FUNC-011 | Orders bulk Create Invoices | Select eligible Orders, open Create Invoice(s), choose consolidated/separate mode, persist invoice links, and reject invalid/company/read-only selections atomically | pass: `pos_order_bulk_invoice.integration.test.ts`; Core3 browser blocked |
| POS-FUNC-010 | Return Products | Paid/Invoiced order action creates a linked negative-line return in the active same-configuration session and survives restart | pass: focused contract/restart suite; browser action pending |
| POS-FUNC-012 | Refund relationship smart buttons | Source order opens filtered Refund Orders and refund order opens its original order with company-scoped read access | planned: `pos_order_refund_links.integration.test.ts` |
| POS-FUNC-013 | Order-detail Send Email | Odoo `action_send_mail` is exposed only when a customer email exists; queue recipient, subject, body and operation durably from the detail action | pass: `pos_order_detail_email.integration.test.ts`; browser evidence blocked |
| POS-FUNC-014 | Session Orders smart button | Session form Orders action opens only orders belonging to the selected current-company session and preserves row navigation/search/status/empty behavior | pass: `pos_session_orders.integration.test.ts`; browser evidence blocked |
| POS-FUNC-015 | Session Pickings smart button | Session form Pickings action opens only Ready pickings belonging to the selected current-company session and preserves row navigation/search/status/empty behavior | pass: `pos_session_pickings.integration.test.ts`; browser evidence blocked |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| POS-WF-001 | Session lifecycle | Opening → opened → closing/closed follows guards, updates versions and prevents unsafe edits during active sessions | pass at contract level; browser workflow planned |
| POS-WF-002 | Cashier order lifecycle | Draft cart → payment → paid/receipt updates order and payment atomically; failed tender leaves the cart unchanged | pass: bounded payment evidence |
| POS-WF-003 | Product/pricing | Product, tax, category, pricelist and combo selections calculate the declared price without client-only defaults | pass at contract level |
| POS-WF-004 | Floor/preparation | Floor/table assignment and printer/preparation transitions remain scoped and recoverable | pass at contract level; browser interaction planned |
| POS-WF-005 | Durable/external boundary | Payment, receipt delivery, printer callbacks and cross-module flows use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| POS-WF-006 | Order return | Return Products links a draft return to its source, copies refundable lines negatively, and rejects stale, duplicate, closed-session, or invalid-state replay | pass: focused mutation/restart suite; browser workflow pending |
| POS-WF-007 | Bulk invoicing | Paid/to-invoice Orders create one grouped or one-per-order invoice run, mark orders Invoiced, and preserve run/order links after migration replay | pass: focused restart suite; authenticated Core3 browser blocked |
| POS-WF-008 | Refund relationship navigation | Existing Return Products relationship is projected durably; related-list and reverse navigation remain read-only and reject missing/cross-company records | planned: focused restart and scope suite |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| POS-PERM-001 | POS Manager | Configuration, catalog and session administration mutations succeed | planned browser actor gate |
| POS-PERM-002 | POS Cashier | Touch order/payment actions work only for assigned open sessions | pass: bounded write evidence |
| POS-PERM-003 | Fleet ordinary user | POS write/payment/configuration actions return 403 and do not change rows | pass: payment boundary |
| POS-PERM-004 | Wrong company | Products, sessions, orders, payments and customers are not leaked or mutable | planned |
| POS-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected data in the response | planned |
| POS-PERM-006 | Stale/missing/invalid | 409/404/422 leaves the current order/session/configuration unchanged | pass at contract level |
| POS-PERM-007 | Return Products boundary | Read-only, wrong-company, unauthenticated, stale, and closed-session callers cannot create a return or alter the source order | pass: focused contract suite |
| POS-PERM-008 | Bulk Create Invoices boundary | `pos.write`, current company, paid/to-invoice/non-invoiced state, selection completeness, and consolidated customer guards hold atomically | pass: focused contract suite |
| POS-PERM-009 | Order-detail Send Email boundary | `pos.write`, current company, signed-in actor, valid recipient/content, current row version, and existing customer email are required; failures are atomic | pass: `pos_order_detail_email.integration.test.ts` |
| POS-PERM-010 | Session Orders boundary | `pos.read`, current company, selected session, missing session, and unauthenticated/forbidden datasource states prevent cross-session or cross-company leakage | pass: `pos_session_orders.integration.test.ts`; browser evidence blocked |
| POS-PERM-011 | Session Pickings boundary | `pos.read`, current company, selected session, missing session, and unauthenticated/forbidden datasource states prevent cross-session or cross-company picking leakage | pass: `pos_session_pickings.integration.test.ts`; browser evidence blocked |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| POS-UI-001 | Touch cashier/payment | 1440x900, 390x844 | Product grid, cart, totals, tender dialog, receipt and touch targets match Odoo | pass for touch route only |
| POS-UI-002 | Sessions/orders/catalog | both | Menus, list/form/kanban tabs, status actions, fields and responsive layout match Odoo | planned full matrix |
| POS-UI-003 | Configuration/reporting | both | Settings, payment methods, floor/table, printer, graph/pivot/list and empty states match Odoo | planned paired capture |
| POS-UI-004 | Current route regression | all manifest-owned POS routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or horizontal overflow | planned |
| POS-UI-005 | Orders bulk invoice wizard | Odoo desktop shows selection, Create Invoices, Order Count, Create/Cancel; Odoo mobile hides bulk selection; Core3 paired capture remains blocked by runtime startup/auth | Odoo reference captured; Core3 pending |
| POS-UI-006 | Refund relationship smart buttons | Odoo paid source shows Refunds and refund draft shows Refunded Orders; related list/detail fit desktop/mobile with no overflow | planned: paired authenticated captures or exact runtime blocker |
| POS-UI-007 | Order-detail Send Email | Odoo order form email action and Core3 detail form/modal are checked at 1440x900 and 390x844 with no request/page errors or overflow | blocked: BrowserSkill tab borrow did not complete; no visual claim |
| POS-UI-008 | Session Orders smart button | Odoo session Orders stat action and Core3 session-scoped list are checked at 1440x900 and 390x844 with no request/page errors or overflow | blocked: BrowserSkill tab borrow did not complete; no visual claim |
| POS-UI-009 | Session Pickings smart button | Odoo session Pickings stat action and Core3 session-scoped Ready picking list are checked at 1440x900 and 390x844 with no request/page errors or overflow | blocked: BrowserSkill tab was already borrowed by another BrowserSkill session; no visual claim |

## Exit criteria

Full POS sign-off requires the focused corpus, authenticated end-to-end cashier
and configuration CRUD, session/order/payment workflows, all actor boundaries,
reload/restart persistence, complete responsive route coverage, and paired Odoo
desktop/mobile comparisons. The verified touch slice is not module completion.
