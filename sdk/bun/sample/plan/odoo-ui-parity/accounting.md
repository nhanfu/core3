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

The configuration reference batch adds explicit Core3 routes for
`/accounting/product-categories`, `/accounting/fiscal-positions`,
`/accounting/tax-groups`, `/accounting/cash-roundings`, and
`/accounting/currencies`, backed by one Accounting migration and searchable
Odoo-style ListView/server-form contracts. The live Odoo 19 demo exposes Product
Categories, Fiscal Positions, and Currencies under Configuration. Tax Groups and
Cash Roundings are not exposed as standalone menus in this installed
Community/demo build; those two routes are documented fixture coverage for the
Accounting model surfaces. The existing Base currency screen remains unchanged.

Authenticated Core3 checks cover all eleven configuration routes at desktop
`1440x900` and mobile `390x844` touch sizes, including Payment Providers and
Payment Transactions. Each route returned seeded records with no unexpected
failed requests or horizontal overflow. Comparison captures are temporary under
`/tmp/core3-accounting-config-*.png` and are not committed.

The non-accounting dispatcher user was checked against
`/accounting/currencies`; Core3 returned the visible 403 Failed to load page
state. The denied-state capture is
`/tmp/core3-accounting-config-denied-desktop.png`.

## Current batch: API boundary extraction

Payments and Journal Entries now bind their list datasources and create-payment/
create-entry server forms from convention-discovered fragments under
`services/accounting/api/`, keyed by `page.id`; their page YAML contains only
layout and action references. Authenticated Chrome verification at 1440x900 and
390x844 confirmed populated lists, New payment/New journal entry dialogs, zero
unexpected responses, and no page-level horizontal overflow. Captures are
temporary under `/tmp/core3-accounting-api-*.png` and are not repository assets.

## Current batch: product and analytic surfaces

The live Odoo menu audit identified Products, Analytic Items, and Analytic
Distribution Models as visible Accounting surfaces. Core3 now exposes
`/accounting/products`, `/accounting/analytic-items`, and
`/accounting/analytic-distribution-models` with service-owned API fragments,
deterministic product fixtures, and reference-matching empty analytic states.
Authenticated desktop/mobile comparison against Odoo was captured under
`/tmp/odoo-accounting-{products,analytic-items,distribution-models}-{desktop,mobile}.png`
and `/tmp/core3-accounting-{desktop,mobile}-*.png`; all routes had zero
unexpected responses and no page-level horizontal overflow.

## Current batch: document forms and payment workflow

The next parity batch adds the shared OdooFormView workflow for invoices,
customer credit notes, vendor bills, and vendor refunds. Each document list
opens the service-owned invoice detail form; draft records expose permissioned
Edit with Save/Discard, while the detail header exposes state-gated Post and
Register payment actions. Role-specific New document dialogs are available for
credit notes, vendor bills, and vendor refunds.

Register payment and Reconciliation use YAML server-form mutations. They reject
non-positive or over-residual payments, create a posted accounting payment,
support partial residual reduction, and transition the document to Paid only
when its residual reaches zero. All actions retain accounting.read/write
permission boundaries and use the existing deterministic demo fixtures.

Authenticated browser evidence was captured at 1440x900 and 390x844 under
/tmp; no screenshots are part of the repository. The remaining parity work is
broader empty/error/denied-state coverage across every Accounting route and
additional Odoo form tabs and relational controls.

## Current batch: review and shipping configuration surfaces

The live Odoo action audit resolved Journal Items to `/odoo/items` (action 257)
and captured the populated Journal Items, Audit Trail (action 305), and
Incoterms (action 303) surfaces at desktop and mobile viewports. Core3 now
provides `/accounting/journal-items`, `/accounting/audit-trail`, and
`/accounting/incoterms` with service-owned API fragments and deterministic
fixtures matching the observed columns and rows. Captures are temporary under
`/tmp/odoo-accounting-{desktop,mobile}-{journal-items,audit-trail,incoterms}.png`
and `/tmp/core3-accounting-{desktop,mobile}-{journal-items,audit-trail,incoterms}.png`.

Journal Items now exposes the shared Odoo-style Posted filter, selectable rows,
column chooser, and List/Pivot view tabs while retaining the service-owned
deterministic datasource. Authenticated checks at 1440x900 and 390x844 loaded
all four rows with no unexpected failures or horizontal overflow; revised
captures are `/tmp/core3-accounting-{desktop,mobile}-journal-items-revised.png`.
The Pivot tab was also exercised successfully and rendered partner debit/credit
aggregates without failed requests; its capture is
`/tmp/core3-accounting-desktop-journal-items-pivot.png`.

Audit Trail now also exposes selectable rows and the column chooser, matching
the installed Odoo list controls. Revised authenticated desktop/mobile checks
loaded all three deterministic records with no unexpected failures or
horizontal overflow; captures are
`/tmp/core3-accounting-{desktop,mobile}-audit-trail-revised.png`.

## Acceptance

- Every installed Odoo Accounting menu has an explicit Core3 route or a
  documented deliberate redirect.
- Authenticated desktop/mobile checks cover list, pivot, kanban, form,
  payment/reconciliation modal, settings, and denied/empty states.
- `bun run audit` passes and commits contain no images.
