# Accounting — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `account`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify the `account` manifest's demo declaration and use its journals, partners, and entries where available.
- Core3 service: `accounting`.

## Menu, action, and view inventory

- Accounting dashboard and journal cards; Customers: invoices, credit notes, payments; Vendors: bills, refunds, payments.
- Accounting: chart of accounts, journal entries, journals, taxes, and reconciliation.
- Invoice/bill list with filters, group-by, list/kanban switch, pager, batch actions, and empty state.
- Invoice/bill form: draft/posted/cancelled status, partner, dates, journal, invoice lines, taxes, totals, payment/register-payment dialogs, attachments, activities, and chatter.
- Reporting: general ledger, aged receivable/payable, tax report, profit and loss, balance sheet, and graph/pivot/list states.
- Mobile dashboard cards, invoice form, reconciliation and overflow menus.

## Core3 backend mock-data coverage

Declare `account_dashboard`, `account_partners`, `account_invoices`, `account_invoice_lines`, `account_payments`, `account_journals`, `account_accounts`, `account_taxes`, `account_reconciliation`, and `account_reports`. Include draft/posted/paid/partial/cancelled, debit/credit, multi-currency, tax, empty, filtered/grouped/paginated, payment dialog, reconciliation match/no-match, mobile, and report fixtures. Every visible total and table row must be deterministic and IDs query-swappable.

## Shared UI primitives

Dashboard cards, control panel/search/pager, list/form/kanban, monetary/date/tax renderers, editable lines, status bar, payment and reconciliation dialogs, graph/pivot/report tables, chatter, attachments, and responsive navigation.

## Screenshots and acceptance checks

Capture `/odoo/accounting` dashboard and each customer/vendor/accounting/report action at 1440x900 and 390x844. Reconcile totals, debit/credit signs, status transitions, menus, report columns, mobile forms, and offline mock rendering; reject blank reports or undeclared datasource records before `ready`.
