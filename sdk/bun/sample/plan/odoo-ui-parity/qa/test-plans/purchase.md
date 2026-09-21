# Purchase detailed QA test plan

Module: purchase  
QA owner: purchase-qa  
Developer owner: purchase module owner  
Reference addon/version: purchase, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan is the module-specific execution design for the Purchase menu and
action inventory in [`purchase.md`](../../purchase.md). Executed evidence,
defects, retests, and sign-off remain in [`../purchase.md`](../purchase.md).

## Coverage inventory

| Odoo menu/action | Core3 route/API | View and fixture scope |
| --- | --- | --- |
| Orders > Requests for Quotation | `/purchase`; `/purchase/purchase-orders`; `purchase-rfqs.yaml` | List, Kanban, Pivot, Graph, Calendar, Activity; RFQ fixtures and bulk merge |
| Orders > Purchase Orders | `/purchase/purchase-orders`; `/purchase/detail`; `purchase-orders.yaml`, `purchase-detail.yaml` | List, Kanban, Pivot, Graph, Calendar, Activity, detail, lock/acknowledge/approval/reset |
| Orders > Purchase Orders > Create Bills | `/purchase/purchase-orders`; `purchase.orders.create_bills` | Select confirmed/received orders, create draft Accounting Vendor Bills, refresh billing status, open Vendor Bills stat |
| Orders > Vendors | `/purchase/vendors`; `/purchase/vendors/detail`; `vendors.yaml` | List, form, active/archived, search, CRUD and lifecycle |
| Products > Products | `/purchase/products`; `/purchase/products/detail`; `purchase-products.yaml` | List, Kanban, Activity, form, archive and product history |
| Products > Product Variants | `/purchase/product-variants`; `/purchase/product-variants/detail` | List, Kanban, Activity, form, archive and chatter |
| Reporting > Purchase | `/purchase/purchase-analysis`; `purchase-analysis.yaml` | Graph, Pivot, List/search, empty and transport-error states |
| Configuration > Settings | `/purchase/settings`; `purchase-settings.yaml` | Settings form and manager-only update |
| Configuration > Vendor Pricelists | `/purchase/vendor-pricelists`; `/purchase/vendor-pricelists/detail` | List, Kanban/cards, form, CRUD and validation |
| Configuration > Attributes | `/purchase/attributes`; `/purchase/attributes/detail` | List/form, values, create/update and duplicate guards |
| Configuration > Categories | `/purchase/product-categories`; `/purchase/product-categories/detail` | List/form, product stat, chatter and CRUD |
| Configuration > Units & Packagings | `/purchase/units-packagings`; `/purchase/units-packagings/detail` | List/form, conversion validation and CRUD; UoM-gated |
| Purchase order stat actions | `/purchase/bill-matching`, `/purchase/price-comparison`, `/purchase/receipt` | Bill matching, price history, receipt lines and receipt workflow |

Actors are Core3 Administrator, Purchase Manager, Purchase User/Fleet
ordinary user, Dispatcher/unauthenticated, and the cross-module Accounting
writer where bill matching requires `accounting.write`. Stable seeded records
include `po-demo-001` through `po-demo-009`, `vendor-demo-*`,
`purchase-product-*`, `purchase-variant-*`, `purchase-category-furniture`,
and the seeded receipt and supplier-information rows.

## Functional and data cases

| Case ID | Class | Odoo action/route | Core3 route/API | Setup/actor | Steps | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PURCHASE-FUNC-001 | functional | Requests for Quotation | `/purchase`; RFQ datasource | Admin, RFQ fixtures | Search, filter status/vendor, sort, paginate, open row | Deterministic RFQs and totals remain correct after reload; empty/no-match states are explicit | `purchase.integration.test.ts` | pass |
| PURCHASE-FUNC-002 | functional | Purchase Orders | `/purchase/purchase-orders`; `purchase_orders` | Admin, confirmed/received fixtures | Switch List/Kanban/Pivot/Graph/Calendar/Activity and open detail | Each view uses the declared datasource and preserves scope and totals | `purchase.integration.test.ts`; matrix | pass |
| PURCHASE-FUNC-003 | functional | New/Edit purchase order | `/purchase/detail`; order-line API | Purchase User, editable RFQ | Add, edit, and delete product lines | Parent/line row versions and order total recalculate and survive reload | `purchase_order_lines.integration.test.ts` | pass |
| PURCHASE-FUNC-004 | functional | Vendors | `/purchase/vendors`; `vendors.yaml` | Purchase Manager | Create, edit, archive, restore, delete vendor | Validation, duplicate and in-use guards apply; final state persists | `purchase_vendors.integration.test.ts` | pass |
| PURCHASE-FUNC-005 | functional | Products and Product Variants | `/purchase/products`, `/purchase/product-variants` | Purchase User | Search, open detail, edit, archive and inspect history | Catalog and variant changes persist with guarded versions; Purchased history is scoped | product detail/history/variant tests | pass |
| PURCHASE-FUNC-006 | functional | Vendor Pricelists | `/purchase/vendor-pricelists` | Purchase User | Create/edit/duplicate/delete supplier information | Positive minimum quantity, nonnegative price/lead time, duplicate and stale guards work | vendor pricelist tests | pass |
| PURCHASE-FUNC-007 | functional | Attributes/Categories/Units | configuration routes | Purchase Manager/UoM user | Create, edit, search, open detail, delete where allowed | Required, duplicate, conversion, in-use, missing, and stale guards persist correctly | attributes/categories/units tests | pass |
| PURCHASE-FUNC-008 | functional | Purchase Analysis | `/purchase/purchase-analysis` | Admin | Search, switch graph/pivot/list, request empty and transport-error fixtures | Declared measures/dimensions and error/empty states render without fabricated rows | `purchase_analysis.integration.test.ts` | pass |
| PURCHASE-FUNC-009 | functional | Bill Matching | `/purchase/bill-matching?id=po-demo-005` | Accounting writer | Select matching lines, match, add bill line to PO | Invalid selection is rejected; matched/add-to-PO flags and order totals persist atomically | `purchase_bill_matching.integration.test.ts` | pass |
| PURCHASE-FUNC-010 | functional | Price Comparison | `/purchase/price-comparison?id=po-demo-005` | Purchase User | Open stat action and search product history | Only selected order products and deterministic comparison rows are returned | `purchase_price_comparison.integration.test.ts` | pass |
| PURCHASE-FUNC-011 | functional | Receipt | `/purchase/receipt?id=po-demo-005` | Purchase User | Add/edit/delete receipt lines, validate and cancel | Receipt line and parent versions, quantities, state, and audit message persist | `purchase_receipt.integration.test.ts` | pass |
| PURCHASE-FUNC-012 | data | All Purchase migrations/seeds | module migrations | Clean and existing development DB | Run migrations twice and query fixed fixtures | Schema/demo application is idempotent and does not duplicate rows or use moving-clock data | focused suites | pass |
| PURCHASE-FUNC-013 | functional | Purchase Orders > Create Bills | `/purchase/purchase-orders`; `purchase.orders.create_bills` | Purchase User, confirmed/received fixtures, Accounting service | Select one or more eligible orders and create bills | Draft Vendor Bills and purchase links persist; billing status becomes Invoiced and detail stat opens the linked bill; empty, missing, locked, RFQ, duplicate, and Accounting failure guards leave no local partial write | `purchase_create_bills.integration.test.ts` | pass |
| PURCHASE-FUNC-014 | functional/data | Confirmed Purchase Order `Send PO` | `/purchase/detail?id=po-demo-005`; `send_confirmed_purchase_order_detail` | Purchase User, confirmed order with vendor email | Open the composer, retain the prefilled Purchase Order recipient/content/attachment, submit Send | A durable Purchase Order email row records the actor/content and remains visible after detail reload and file-backed restart; order state is unchanged | `purchase_order_send_po.integration.test.ts`; `PURCHASE-SEND-PO-001` | planned |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Initial state | Action/event | Expected transition/side effect | Failure/retry/recovery assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PURCHASE-WF-001 | workflow | RFQ lifecycle | Draft/Sent | Send, confirm, cancel, reset | State and confirmation fields change with row versions | Forbidden/stale transition returns 409 and leaves data unchanged | order-line/integration tests | pass |
| PURCHASE-WF-002 | workflow | Approval | To Approve | Manager Approve Order | Order becomes Confirmed and approval status is approved | Ordinary user/invalid state/stale version is rejected | `purchase.integration.test.ts` | pass |
| PURCHASE-WF-003 | workflow | Lock and acknowledge | Confirmed | Lock, acknowledge, unlock | Lock/acknowledgement flags and timestamps persist | Locked, already acknowledged, and stale actions return guarded 409 | integration/acknowledgement tests; browser proof | pass |
| PURCHASE-WF-004 | workflow | Receipt fulfillment | Ready receipt | Validate or cancel receipt | Receipt state and related quantities/audit history update | Not-ready and stale validation cannot partially update records | `purchase_receipt.integration.test.ts` | pass |
| PURCHASE-WF-005 | integration | Accounting bill matching | Unmatched bill lines | Match or add to PO | Matching flags and PO lines/total update in one mutation | Invalid selection and target lock fail without partial writes | `purchase_bill_matching.integration.test.ts` | pass |
| PURCHASE-WF-006 | integration | Chatter/messages | Any supported detail | Send message or log note | Message is stored with author and timestamp and is visible after reload | Blank content and missing record are rejected | category/variant detail tests | pass |
| PURCHASE-WF-007 | integration | External/durable workflow boundary | N/A | Review declared integrations | No durable/third-party side effect is silently implemented as local-only; future durable work uses Temporal contract | Retry, timeout, compensation, and recovery cases are added before activation | module contract review | planned |
| PURCHASE-WF-008 | integration | Accounting vendor-bill creation | Confirmed/Received and uninvoiced | Purchase Orders list `Create Bills` | Accounting receives a `Vendor Bill` source link and Purchase records the durable bill relation | Accounting rejection, missing selection, invalid state, duplicate retry, and restart replay are rejected or idempotent without a local partial link | `purchase_create_bills.integration.test.ts` | pass |
| PURCHASE-WF-009 | integration | Confirmed-order vendor email | Confirmed/Received | Invoke `Send PO` and submit the mail composer | The Purchase Order template/report attachment is recorded; Confirmed/Received remains unchanged | Missing/stale/invalid vendor, content, actor, and RFQ-state inputs fail atomically; retry requires the current row version | `purchase_order_send_po.integration.test.ts` | planned |

## Permission and security cases

| Case ID | Class | Actor/scope | Route/API/action | Expected visibility/result | Direct-enforcement evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PURCHASE-PERM-001 | permission | Administrator/manager | all Purchase routes and `purchase.manage` actions | Full configured menu and manager actions visible | Direct mutation allows approved/unlock/settings operations | focused suites | pass |
| PURCHASE-PERM-002 | permission | Purchase User | `purchase.write` actions | Ordinary write actions visible; manager-only actions hidden/denied | Direct API enforces permission even when action is invoked without UI | focused suites | pass |
| PURCHASE-PERM-003 | permission | Fleet ordinary user | Purchase routes and mutations | Read/write boundary is denied where Purchase permission is absent | HTTP/API returns 403; no database change | authenticated permission probe | planned |
| PURCHASE-PERM-004 | permission | Accounting writer without Purchase write | bill matching | Only accounting-authorized matching path is allowed as declared | Direct action checks its declared permission and target scope | contract test | pass |
| PURCHASE-PERM-005 | security | Unauthenticated/expired session | every route and `/api/*` | Redirect/401/403 without data leakage | Direct request has no successful datasource or mutation response | browser/API matrix | planned |
| PURCHASE-PERM-006 | security | Wrong company/branch or missing record | detail and mutations | Record is hidden or returns not-found; no cross-scope mutation | Missing, stale, and scoped guards are verified with response and query | focused suites | pass |

## Visual, responsive, and regression cases

| Case ID | Class | Odoo state | Core3 state | Viewport | Required comparison/assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PURCHASE-UI-001 | visual | RFQ/PO populated list | `/purchase` and `/purchase/purchase-orders` | 1440x900, 390x844 | Menu order, List/Kanban tabs, columns/cards, labels, spacing, and no overflow | Odoo/Core3 captures in sub-plan; fresh matrix | partial |
| PURCHASE-UI-002 | visual | PO detail | `/purchase/detail?id=po-demo-005` | 1440x900, 390x844 | Header actions, statusbar, product lines, totals, stat buttons, and chatter match | captures and acknowledge screenshot | partial |
| PURCHASE-UI-003 | visual | Configuration list/detail | attributes/categories/units/vendors/pricelists | both viewports | Menu placement, forms, tables/cards, required labels, empty and not-found states | route matrix; paired captures where available | partial |
| PURCHASE-UI-004 | visual | Analysis/report | `/purchase/purchase-analysis` | both viewports | Graph/Pivot/List controls, measures, filters, loading/error/empty states | route matrix and Odoo reference | partial |
| PURCHASE-UI-005 | interaction | PO acknowledgement | PO detail | both viewports | Click action, visible action removal/state update, reload persistence, no console/request errors | `/tmp/core3-purchase-acknowledge-desktop.png` | pass |
| PURCHASE-UI-006 | regression | All registered routes | all 23 route registrations | both viewports | Authenticated navigation has non-empty state, no page errors, failed requests, or horizontal overflow | fresh 46-check matrix | pass |

## Exit criteria

- Every visible Purchase menu/action has a case above.
- Focused contracts, direct permission checks, persistence/workflow checks, and
  authenticated desktop/mobile route evidence are recorded in the ledger.
- Fresh paired Odoo/Core3 comparison covers normal, detail, configuration,
  report, empty, error, and permission states before final module sign-off.
- No case is promoted to full parity pass from YAML parsing or unit coverage
  alone; browser and database evidence are required for the relevant claim.

## 2026-09-21 bounded addendum — Purchase Order Print

| Case ID | Class | Setup/actor | Exact action | Expected persistence/evidence | Status |
| --- | --- | --- | --- | --- | --- |
| PURCHASE-FUNC-014 | functional/data | Admin Purchase user; `po-demo-001` Draft and `po-demo-005` Confirmed | Click the state-specific `Print` action on `/purchase/detail` | Quotation and Purchase Order PDF contracts are recorded with source report IDs; Draft becomes Sent, Confirmed remains Confirmed; history survives reload/restart | pass: `purchase_order_print.integration.test.ts` |
| PURCHASE-WF-009 | workflow/security | Purchase reader; stale, missing, invalid-state, and blank-actor inputs | Invoke `purchase.report_purchase_quotation` / `purchase.action_report_purchase_order` | 404/409/403 guards reject invalid requests and leave no print run; current row version is required | pass: focused test |
| PURCHASE-UI-007 | visual/responsive/interaction | Authenticated QA actor; live `core3_reference` and Core3 Purchase runtime | Compare confirmed Purchase Order detail at desktop/mobile and click `Print` | Odoo/Core3 show the Print control; Core3 action returns HTTP 200 and refreshes detail; no page overflow; Odoo download completion is not DOM-observable | conditional: paired captures and blocker recorded in Purchase QA ledger |

## 2026-09-22 bounded addendum — RFQ composer

| Case ID | Class | Setup/actor | Exact action | Expected persistence/evidence | Status |
| --- | --- | --- | --- | --- | --- |
| PURCHASE-FUNC-015 | functional/data | Purchase writer; Draft `po-demo-001` with a vendor email | Open `/purchase/detail`, invoke `Send RFQ`, submit the prefilled composer | A `purchase_order_emails` row records recipient, subject, body, attachment, actor, and timestamp; Draft becomes Sent and reload/restart preserves the message | pass: `purchase_order_email.integration.test.ts` |
| PURCHASE-WF-010 | workflow/security | Missing/stale order, invalid vendor/content, anonymous actor, and read-only actor | Invoke the RFQ composer mutation with invalid or stale inputs | 404/409/422/403 guards reject atomically; no email row or partial state transition is written; only Draft/Sent are eligible | pass: focused test |
| PURCHASE-UI-008 | visual/responsive/interaction | Authenticated QA actor; Odoo `core3_reference` P00011 and Core3 `po-demo-001` | Compare the composer at desktop and mobile, then submit | Odoo shows recipient, subject, body, PDF attachment, Send, and Discard. Core3 should open the matching modal and persist history without console/request errors | conditional: Odoo paired captures pass; Core3 button renders but click has no request/modal in shared runtime, blocker recorded |

## 2026-09-22 bounded addendum - confirmed Send PO composer

| Case ID | Class | Setup/actor | Exact action | Expected persistence/evidence | Status |
| --- | --- | --- | --- | --- | --- |
| PURCHASE-FUNC-016 | functional/data | Purchase writer; Confirmed `po-demo-005` with vendor email | Open `/purchase/detail`, invoke `Send PO`, submit the prefilled composer | `purchase_order_emails` records the Purchase Order template, vendor, content, PDF attachment, actor, and timestamp; order remains Confirmed after reload/restart | conditional pass: `purchase_order_send_po.integration.test.ts` |
| PURCHASE-WF-011 | workflow/security | Confirmed/Received, Draft RFQ, missing/stale order, invalid vendor/content, blank actor | Invoke the confirmed-order email mutation with each state/input | Confirmed and Received are allowed without a state transition; RFQ and invalid inputs return guarded 404/409/422/403 responses with no partial email row | pass: focused test |
| PURCHASE-UI-009 | visual/responsive/interaction | Authenticated Odoo `core3_reference` P00012 and Core3 Purchase runtime | Compare `Send PO` composer at desktop/mobile and exercise Send/Discard | Odoo shows recipient, subject, Purchase Order body with amount/expected receipt/acknowledge link, PDF attachment, Send, and Discard. Core3 detail/action is visible at both viewports, but shared `server_form` dispatch produces no modal/request | conditional: `PURCHASE-SEND-PO-001` |
