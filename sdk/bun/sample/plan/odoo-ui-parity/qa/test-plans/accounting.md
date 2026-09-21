# Accounting detailed QA test plan

Module: accounting  
QA owner: accounting-qa  
Developer owner: accounting module owner  
Reference addon/version: account, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`accounting.md`](../../accounting.md); executed evidence is
recorded in [`../accounting.md`](../accounting.md).

## Coverage inventory

| Menu/action family | Core3 route families | Required scope |
| --- | --- | --- |
| Invoicing | `/accounting`, `/accounting/invoices`, `/accounting/credit-notes`, `/accounting/payments`, `/accounting/customers`, `/accounting/products` | Dashboard, list/kanban/pivot, detail, create/post/cancel/payment and relations |
| Vendors | `/accounting/vendor-bills`, `/accounting/vendor-refunds`, `/accounting/vendor-payments`, `/accounting/vendors`, `/accounting/vendor-products` | Vendor documents, payment form/workflow and product history |
| Accounting transactions | `/accounting/journal-entries`, `/accounting/journal-entry-detail`, `/accounting/journal-items`, `/accounting/entries-to-review`, `/accounting/reconciliation`, `/accounting/internal-transfers` | Draft/post/reset, reconciliation, transfers, graph/pivot/list |
| Reporting | `/accounting/analysis`, `/accounting/reports/*`, `/accounting/partner-ledger`, `/accounting/sales`, `/accounting/purchases`, `/accounting/amounts-to-settle` | Graph/pivot/list, search/filter, empty/error and scoped measures |
| Configuration | journals, chart of accounts, taxes, terms, currencies, fiscal positions, tax groups, cash roundings, products, analytic, payments and settings routes | CRUD/validation/archive, manager settings and read-only states |

Actors: Accounting Administrator/Manager, Accounting User, Fleet ordinary user,
unauthenticated/wrong-company user, and declared Sales/Purchase/Expense
cross-module writers. Stable invoice, journal, partner, payment, bank
statement, analytic, tax, configuration and reconciliation fixtures are
required; development migrations must be idempotent.

## Functional and data cases

| Case ID | Class | Surface | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| ACC-FUNC-001 | functional | Dashboard and document lists | Search/filter/view tabs/pagination and role-specific columns render real rows | focused suite; route matrix | pass |
| ACC-FUNC-002 | functional | Invoice/vendor bill detail | Create/edit/post/cancel, Credit Note reversal, line totals, residuals and payment relations persist after reload | focused document/payment/reversal suites | pass |
| ACC-FUNC-003 | functional | Payments/transfers/reconciliation | Create/edit/register/reconcile with balanced and invalid values | focused payment/reconciliation suites | pass |
| ACC-FUNC-004 | functional | Journals/accounts/taxes/catalogs | CRUD, archive, duplicate, validation, missing and stale guards work | focused catalog suites | pass |
| ACC-FUNC-005 | functional | Reports/ledgers/analysis | Declared graph/pivot fields and filters return deterministic scoped data | focused report suites | pass |
| ACC-FUNC-006 | functional | Settings/closing/secure entries | Manager settings and closing actions persist; secure transition is guarded | settings/secure tests | pass |
| ACC-FUNC-007 | functional | Empty/error/forbidden | Every route has explicit empty, no-result, missing, 403 and 503 behavior | focused suite; matrix | pass |
| ACC-FUNC-008 | data | Schema/demo | Reapply migrations on clean/existing development DB without duplicates or moving fixture values | focused suite | pass |
| ACC-FUNC-009 | functional | Import/export/attachments/print | Exercise available import/export, attachment, report and print actions | Journal Items export contract; Bank Statement attachment contract: `accounting_bank_statement_attachments.integration.test.ts` | partial; Journal Items export and Bank Statement attachment pass, broader actions planned |

### Invoice Print report addendum (2026-09-21)

| Case ID | Class | Surface | Expected result and evidence | Status |
| --- | --- | --- | --- | --- |
| ACC-FUNC-010 | functional/data | Posted customer invoice Print | Page/API `invoice-detail` contracts match; report identity and filename are persisted in print history and survive DuckDB close/reopen | pass; `accounting_invoice_print.integration.test.ts` |
| ACC-WF-007 | workflow | Invoice Print state guard | Unchanged posted customer invoice and customer credit note can print; missing, stale, vendor, and blank-actor requests are rejected without a row | pass; focused integration test |
| ACC-PERM-007 | permission | Invoice Print read boundary | Page/action are `accounting.read` guarded and the mutation requires a signed-in Accounting actor | pass at contract/actor guard level; full alternate-role browser probe remains planned |
| ACC-UI-005 | visual/responsive | Invoice detail Print | Odoo desktop/mobile action placement and successful PDF download are captured; Core3 desktop/mobile action requests and refreshed history are captured | conditional; Core3 reload persistence and binary PDF download remain open |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected side effect | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| ACC-WF-001 | workflow | Invoice lifecycle | Draft → Posted → Paid/Cancelled and posted invoice → draft Credit Note/Vendor Refund with durable relationship | invalid/stale transition returns 409, no partial posting | pass at contract level |
| ACC-WF-002 | workflow | Vendor payment | Draft → Posted and vendor residual updates | unbalanced/invalid payment rejected atomically | pass at contract level |
| ACC-WF-003 | workflow | Bank statement/reconciliation | Lines reconcile to payment/journal and remaining balance updates | duplicate/stale line cannot reconcile twice | pass at contract level |
| ACC-WF-004 | workflow | Internal transfer/secure closing | Transfer and secure-entry state changes are audited | forbidden state and permission failures leave data unchanged | pass at contract level |
| ACC-WF-005 | integration | Sales/Purchase/Expenses | Cross-module references use declared service contracts, not cross-service SQL | downstream failure is explicit and source transaction remains consistent | planned |
| ACC-WF-006 | integration | Durable/external boundary | Payment provider, email, webhook, bank import or long-running close uses Temporal when activated | retry/timeout/compensation/replay/restart/shutdown required | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| ACC-PERM-001 | Administrator/manager | Full configured accounting actions and settings allowed | planned |
| ACC-PERM-002 | Accounting user | Ordinary read/write operations allowed within company scope | planned |
| ACC-PERM-003 | Fleet ordinary user | Accounting route/API returns 403 and no mutation | pass for route boundary; mutation probe planned |
| ACC-PERM-004 | Wrong company/branch | No cross-company document, partner or ledger leakage | planned |
| ACC-PERM-005 | Unauthenticated/expired | Redirect/401/403 without financial data leakage | planned |
| ACC-PERM-006 | Stale/missing | 409/404/422 and unchanged balances/rows | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| ACC-UI-001 | Dashboard/document list/detail | 1440x900, 390x844 | Odoo menus, tabs, columns/cards, form sections, labels, toolbar and overflow match | partial |
| ACC-UI-002 | Payment/reconciliation forms | both | Statuses, totals, validation, dialogs and action placement match | partial |
| ACC-UI-003 | Reports/configuration | both | Graph/pivot/list controls, settings navigation, empty/error/permission states match | partial |
| ACC-UI-004 | Full current route regression | all 80 accounting routes | 160 authenticated desktop/mobile checks with no errors, blank states or overflow | pass |

## Exit criteria

- Every registered Accounting route/action family has a functional, permission,
  persistence, responsive and visual case.
- Full sign-off requires browser CRUD/actor probes and paired Odoo comparison;
  route smoke and contract tests alone are insufficient.
