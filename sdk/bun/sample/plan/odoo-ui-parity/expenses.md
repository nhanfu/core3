# Expenses — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `hr_expense`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify the manifest demo declaration; use demo employees, expense products, and reports where supplied.
- Core3 service: `expenses`.

## Menu, action, and view inventory

- My Expenses, All Expenses, Expense Reports, To Approve, and configuration/expense products.
- Expense list/kanban with draft, reported, submitted, approved, refused, and paid states; search/filter/group/pager.
- Expense form: employee, description, product/category, date, amount/currency, tax, analytic account, attachment/receipt, notes, submit/report/approve/refuse actions, activities, and chatter.
- Expense report form: grouped lines, totals, approver, payment status, accounting link, and dialogs.
- Reporting charts/tables and mobile receipt upload, line editor, and action overflow.

## Core3 backend mock-data coverage

Declare `expense_records`, `expense_reports`, `expense_employees`, `expense_products`, `expense_taxes`, `expense_analytic_accounts`, `expense_attachments`, `expense_activities`, and `expense_report_summary`. Cover all statuses, receipt/no-receipt, currencies/taxes, empty/filter/group/pagination, submit/approve/refuse dialogs, mobile capture, and report states. Include line totals and relational options; retain datasource IDs for later queries.

## Shared UI primitives

Shell/control panel, list/kanban/form, status bar, monetary/date fields, receipt uploader/attachment, editable report lines, approval dialogs, activities/chatter, charts, pager, and mobile navigation.

## Screenshots and acceptance checks

Capture `/odoo/expenses` and report/configuration actions at 1440x900 and 390x844. Verify status colors and transitions, totals, receipts, empty states, menu labels, mobile line/attachment UX, complete YAML coverage, and backend-offline rendering before `ready`.
