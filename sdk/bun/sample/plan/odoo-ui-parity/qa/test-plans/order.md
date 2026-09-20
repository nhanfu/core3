# Sales / Order detailed QA test plan

Module: order  
QA owner: order-qa  
Developer owner: order module owner  
Reference addon/version: sale_management and sale, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`sales.md`](../../sales.md); executed evidence is recorded
in [`../order.md`](../order.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Quotations and orders | `/order/quotations`, `/order/sales-orders`, order detail routes | Search/filter, order CRUD, lines, chatter, state actions and optimistic concurrency |
| Upsell | `/order/orders-to-upsell` | Scoped upsell rows, search, empty and transport-error states |
| Reporting | `/order/reporting/customers`, `/order/reporting/salespersons` | Graph/pivot/list defaults, grouping, date filters and read-only boundaries |
| Configuration | `/order/quotation-templates`, sales-team routes | Template/line CRUD, Sales Teams navigation, validation and manager permissions |

Actors are Sales Manager, Sales User, Fleet ordinary user, wrong-company user
and unauthenticated user. Fixtures use stable customers, products, orders,
quotation templates, teams, lines and report rows; mutation tests use isolated
databases and generated IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| ORDER-FUNC-001 | Quotations/orders | Read lists, search/filter/sort, open detail, edit fields and lines, and preserve values after reload | pass: focused suite; browser reload planned |
| ORDER-FUNC-002 | Order lifecycle | Draft → Sent → Confirmed → Cancelled and valid recovery paths update row versions atomically | pass: focused suite |
| ORDER-FUNC-003 | Upsell | Query scoped upsell records and deterministic search-empty, explicit-empty and transport-error states | pass: focused suite |
| ORDER-FUNC-004 | Quotation templates | Create/edit/duplicate guard, line CRUD, validation, stale-write and missing-record handling | pass: focused suite |
| ORDER-FUNC-005 | Sales Teams | Configuration list/detail and Sales Orders → Sales Teams action preserve CRM-owned scope and manager guards | pass: focused suite |
| ORDER-FUNC-006 | Reporting | Customer and salesperson reports expose Odoo graph/pivot/search/date contracts with real scoped rows | pass: focused suite |
| ORDER-FUNC-007 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate orders, lines, templates or teams | planned restart/migration gate |
| ORDER-FUNC-008 | Attachments/import/export/print | Exercise exposed order attachments, import/export and print actions, including failure recovery | planned browser interaction gate |
| ORDER-FUNC-009 | Orders to Invoice bulk action | Select eligible approved orders, create draft invoices atomically, refresh queue state, reject empty/duplicate/mixed-scope/already-invoiced selections, and preserve rows on failure | pass: focused suite |
| ORDER-FUNC-010 | Quotation email composer | Compose and send a quotation email with recipient, subject, body, attachment, durable mail history, draft-to-sent transition, and stale/scope/content guards | pass: focused suite |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| ORDER-WF-001 | Order confirmation | Confirmation validates customer/lines, updates state/version and does not partially write on failure | pass: focused suite |
| ORDER-WF-002 | Order cancellation/recovery | Cancellation guards invalid states and preserves audit/chatter history | pass at contract level |
| ORDER-WF-003 | Template to order | Template and lines can seed an order without bypassing Order-owned mutation validation | planned browser integration gate |
| ORDER-WF-004 | CRM/customer boundary | Customer references resolve through the owning Base/CRM service and never write foreign tables directly | planned integration gate |
| ORDER-WF-005 | Durable/external boundary | Mail, payment, delivery callbacks and cross-module workflows use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| ORDER-WF-006 | Quotation email send | Odoo `action_quotation_send` inputs persist atomically, record the actor/timeline event, and survive file-backed reopen and migration replay | pass: focused suite; browser delivery gate planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| ORDER-PERM-001 | Sales Manager | Full order/template/team configuration mutations succeed | planned browser actor gate |
| ORDER-PERM-002 | Sales User | Permitted order reads and lifecycle actions work within company/team scope | planned |
| ORDER-PERM-003 | Fleet ordinary user | Protected Sales routes/actions return 403 and do not change rows | planned |
| ORDER-PERM-004 | Wrong company | Orders, customers, templates and teams are not leaked or mutable | planned |
| ORDER-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected data in the response | planned |
| ORDER-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current order/template/team unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| ORDER-UI-001 | Quotations/orders | 1440x900, 390x844 | Odoo menu order, list/kanban/detail labels, statusbar, tabs and responsive layout match | partial |
| ORDER-UI-002 | Order form/lines/chatter | both | Header actions, line editor, totals, chatter and error states match Odoo | planned paired capture |
| ORDER-UI-003 | Upsell/reporting/configuration | both | Empty states, graph/pivot/list controls, templates and Sales Teams match Odoo | planned paired capture |
| ORDER-UI-004 | Current route regression | all manifest-owned Order routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or overflow | planned fresh matrix |

## Exit criteria

Full Order sign-off requires the focused suite, authenticated CRUD and order
lifecycle browser probes, all actor boundaries, reload/restart persistence,
paired Odoo desktop/mobile comparisons, and a clean scoped plus repository
discovery audit. The current repository-wide audit defect remains open until
its owning module repairs the invalid datasource contracts.
