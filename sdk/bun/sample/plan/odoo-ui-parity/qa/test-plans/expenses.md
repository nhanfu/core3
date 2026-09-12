# Expenses detailed QA test plan

Module: expenses  
QA owner: expenses-qa  
Developer owner: expenses module owner  
Reference addon/version: hr_expense, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`expenses.md`](../../expenses.md); executed evidence is
recorded in [`../expenses.md`](../expenses.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| My/All expenses | expense list/detail/next routes | Expense CRUD, receipts, duplicate review, approval state, activities and payment state |
| Reporting | expense and department analysis routes | Graph/pivot/list filters, department scope and read-only reports |
| Configuration | categories, department approvals and settings routes | Category CRUD/archive, manager approval rules and validation |
| Wizards | split and post-expenses routes | Line editing, total validation, journal/date validation and safe application |

Actors are Expense Manager, Expense User, department approver, Fleet ordinary
user, wrong-company user and unauthenticated user. Fixtures use stable expenses,
employees, departments, receipts, categories, journals, duplicate candidates
and split lines. Mutations use isolated databases and deterministic dates/IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| EXPENSE-FUNC-001 | Expense list/detail | Search/filter, detail edit, receipt state, activities and required-field validation use persisted service data | pass: focused suite |
| EXPENSE-FUNC-002 | Categories | Create/edit/archive/restore, duplicate and stale guards persist correctly | pass: focused suite |
| EXPENSE-FUNC-003 | Duplicate review | Candidate decisions, refusal reasons and activities update the owning expense atomically | pass: focused suite |
| EXPENSE-FUNC-004 | Split wizard | Line CRUD validates exact totals and applies a matching split without partial writes | pass: focused suite |
| EXPENSE-FUNC-005 | Posting/approval | Receipt requirement, approval/refusal, journal/date validation and payment states follow Odoo guards | pass: focused suite |
| EXPENSE-FUNC-006 | Reporting | Expense and department reports expose deterministic grouped data and department scope | pass: focused suite |
| EXPENSE-FUNC-007 | Empty/error/not-found | Missing, empty, forbidden and transport-error states are explicit for each datasource | pass at contract level |
| EXPENSE-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate expenses, receipts or activities | planned restart/migration gate |
| EXPENSE-FUNC-009 | Receipts/import/export/print | Exercise receipt upload/preview, expense import/export and exposed report/print actions | planned browser interaction gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| EXPENSE-WF-001 | Expense lifecycle | Draft → Submitted → Approved → Posted and refusal/reopen paths update versions atomically | pass: authenticated workflow probe |
| EXPENSE-WF-002 | Duplicate review | Approve/refuse duplicate candidate records decision and activity, with stale replay rejected | pass: focused suite |
| EXPENSE-WF-003 | Department approval | Department and manager boundaries select the correct approver and preserve scope | pass at contract level |
| EXPENSE-WF-004 | Accounting integration | Posting uses the declared journal/date contract and maintains expense/accounting relation | pass at contract level; browser integration planned |
| EXPENSE-WF-005 | Durable/external boundary | Receipt processing, notifications, posting callbacks and cross-module flows use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| EXPENSE-PERM-001 | Expense Manager | Approval, posting, category and configuration mutations succeed | planned browser actor gate |
| EXPENSE-PERM-002 | Expense User | Own expense reads/submission and permitted edits work within company scope | planned |
| EXPENSE-PERM-003 | Department approver | Only assigned department approvals are allowed | pass at contract level |
| EXPENSE-PERM-004 | Fleet ordinary user | Manager approval/posting/configuration actions return 403 and do not change rows | pass: permission probe |
| EXPENSE-PERM-005 | Wrong company | Expenses, receipts, employees, journals and reports are not leaked or mutable | planned |
| EXPENSE-PERM-006 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| EXPENSE-PERM-007 | Stale/missing/invalid | 409/404/422 leaves the current expense unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| EXPENSE-UI-001 | Expense list/detail | 1440x900, 390x844 | Menu order, list/detail fields, receipt/status controls and responsive layout match Odoo | route smoke pass; paired comparison pending |
| EXPENSE-UI-002 | Approval/duplicate/split/post dialogs | both | Dialogs, line grid, validation and action states match Odoo | planned paired capture |
| EXPENSE-UI-003 | Reports/configuration | both | Graph/pivot/list, department scope, categories and settings match Odoo | planned paired capture |
| EXPENSE-UI-004 | Current route regression | all 10 registered routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or horizontal overflow | pass: 20-check matrix |

## Exit criteria

Full Expenses sign-off requires the focused suite, authenticated CRUD and
end-to-end lifecycle/wizard workflows, all actor boundaries, reload/restart
persistence, and paired Odoo desktop/mobile comparisons. Current lifecycle,
permission and route evidence is conditional progress, not module completion.
