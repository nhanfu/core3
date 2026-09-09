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
Accounts, Journals, Taxes, Payment Terms, reporting, analytic, closing,
payment provider/token/transaction, and reconciliation routes under
`/accounting/*`. Integrated browser smoke checks cover the new report,
analytic, closing, payment-method, credit-note, vendor-bill, and vendor-refund
states; the implementation remains image-free in Git.

Visual comparison of the invoice list against the fresh Odoo `/odoo/invoicing`
screen found that Odoo opens the list unselected. Core3 now keeps the invoice
list unselected on entry and preserves explicit double-click navigation to the
detail form; comparison captures remain temporary local evidence.

The Accounting Settings route now uses the shared SettingsView contract and
loads the service stylesheet with the client token path. Authenticated Chrome
comparison against Odoo `/odoo/settings` verifies the toolbar, vertical
settings navigation, section bands, two-column cards, tab switching, search
filtering, and a mobile single-column layout; captures remain temporary local
evidence.

The customer and vendor list batch adds explicit `/accounting/customers` and
`/accounting/vendors` routes with deterministic partner fixtures and Odoo list
columns. These are compared with Odoo `/odoo/customers` and `/odoo/vendors` at
desktop and mobile viewports; captures remain temporary local evidence.

The dashboard batch adds `/accounting` as the direct Core3 counterpart to
Odoo `/odoo/accounting`, with deterministic Sales, Purchases, Bank, and Point
of Sale summary fixtures and an explicit Invoicing menu group. Desktop/mobile
captures remain temporary local evidence.

The document batch adds fixture-backed `/accounting/credit-notes`,
`/accounting/vendor-bills`, and `/accounting/vendor-refunds` list states with
the same role-specific columns observed at Odoo `/odoo/credit-notes`,
`/odoo/vendor-bills`, and `/odoo/vendor-refunds`. Desktop/mobile captures are
kept outside Git.

The reporting and reconciliation batch adds
`/accounting/reports/invoice-analysis`, `/accounting/reports/analytic`,
`/accounting/reports/partner`, `/accounting/reports/taxes`,
`/accounting/reports/statements`, `/accounting/reconciliation`,
`/accounting/analytic-accounts`, `/accounting/analytic-plans`, and
`/accounting/closing`. Invoice analysis, analytic, and partner reports expose
list/pivot states; reconciliation exposes a register-payment form against
posted invoices with a residual balance; payment tokens intentionally exercise
an authenticated empty state.

## Remaining parity work

Add explicit menu/page coverage for the remaining customer/vendor product and
configuration surfaces. Implement OdooFormView detail pages, create/edit forms,
register-payment and reconciliation modals, filters, empty/error/permission
states, and responsive desktop/mobile behavior using service-owned fixtures.

## Acceptance

- Every installed Odoo Accounting menu has an explicit Core3 route or a
  documented deliberate redirect.
- Authenticated desktop/mobile checks cover list, pivot, kanban, form,
  payment/reconciliation modal, settings, and denied/empty states.
- `bun run audit` passes and commits contain no images.
