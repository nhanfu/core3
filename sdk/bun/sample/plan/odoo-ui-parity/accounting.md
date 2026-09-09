# Accounting UI parity

Status: in-progress

## Reference gate

- Odoo addon/version: `account`, with Sales dependencies, Odoo 19 Community.
- Official demo data: enabled in the fresh `core3_demo` database at
  `http://localhost:8069`.
- Visible menu families: Invoicing (Dashboard; Customers: Invoices, Credit
  Notes, Payments, Products, Customers; Vendors: Bills, Refunds, Payments,
  Products, Vendors); Accounting (Transactions: Journal Entries, Analytic
  Items; Closing); Review (Journal Items, Audit Trail); Reporting (Invoice
  Analysis, Analytic Report, Partner Reports, Taxes and Fiscal, Statement
  Reports); Configuration (Settings; Chart of Accounts, Taxes, Journals,
  Currencies, Fiscal Positions, Multi-Ledger, Tax Groups, Cash Roundings;
  Payment Terms, Incoterms, Product Categories; Payment Providers, Methods,
  Tokens, Transactions; Analytic Distribution Models, Accounts, Plans).

## Existing Core3 surface

The accounting service provides YAML-first invoices with list/kanban/pivot
views, create and payment forms, invoice workflow, journal entries, payments,
and analysis. It currently exposes `/accounting/invoices`,
`/accounting/journal-entries`, `/accounting/payments`, and
`/accounting/analysis`, with deterministic invoice, journal-entry, and payment
fixtures. Invoice list double-click navigation is verified at
`/accounting/invoice-detail` and renders an OdooFormView detail state.

The current batch adds authenticated, fixture-backed Settings, Chart of
Accounts, Journals, Taxes, and Payment Terms routes under `/accounting/*`.
Each route was smoke-tested in desktop Chrome; the implementation remains
image-free in Git.

## Remaining parity work

Add explicit menu/page coverage for the remaining customer/vendor, reporting,
payment-provider, analytic-account, closing, and settings surfaces. Implement
OdooFormView detail pages, create/edit forms,
register-payment and reconciliation modals, filters, empty/error/permission
states, and responsive desktop/mobile behavior using service-owned fixtures.

## Acceptance

- Every installed Odoo Accounting menu has an explicit Core3 route or a
  documented deliberate redirect.
- Authenticated desktop/mobile checks cover list, pivot, kanban, form,
  payment/reconciliation modal, settings, and denied/empty states.
- `bun run audit` passes and commits contain no images.
