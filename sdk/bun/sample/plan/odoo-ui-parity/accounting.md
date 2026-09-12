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

## Current batch: configuration catalog ownership

Taxes, Journals, Chart of Accounts, Payment Terms, and Payment Methods now use
service-owned API fragments and the idempotent migration
`20260910170000-009-accounting-config-catalog.yaml`, rather than page-local
`VALUES` queries. Each surface exposes a permissioned shared server form for
creating a catalog record. Authenticated desktop/mobile checks loaded 3, 5, 5,
3, and 3 seeded records respectively with no unexpected failed responses or
horizontal overflow. Fresh Core3 comparison captures are under
`/tmp/core3-accounting-config-{taxes,journals,chart-of-accounts,payment-terms,payment-methods}-{desktop,mobile}.png`;
the Odoo comparison captures remain under `/tmp/odoo-accounting-config-*`.
The implementation was developed in the dedicated
`agent/odoo-ui-accounting-config` worktree and integrated as `5afc52db`.

## Current batch: Payment Methods action and form states

The live Odoo 19 audit resolved Accounting → Configuration → Payment Methods
to `/odoo/accounting/payment-methods`. At 1440x900 and 390x844 the owned
database showed the Odoo empty list state (`Name`, `Active`, and the provider
configuration prompt); the `New` form exposed `Name`, `Code`, `Active`,
`Countries`, `Currencies`, and `Providers`/`Brands` tabs. Core3 now keeps the
list and detail layouts presentation-only, joins their service-owned API
fragments by `page.id`, and provides deterministic Bank, Cash, and Card rows
with guarded create, edit, archive/restore, and delete actions. API tests cover
search, empty/detail/transport-error states, duplicate and code validation,
missing and stale records, permissions, and idempotent migration. Authenticated
comparison captures are temporary under `/tmp` and are not repository assets.

## Current batch: customer payments views

The Payments surface now follows the live Odoo customer-payments action with
List, Kanban, Graph, and Activity tabs, status filters, payment-method and
partner grouping, Odoo-shaped payment columns, and row navigation to a
read-only payment form. The payment contract owns journal and currency fields
with deterministic defaults so created and migrated payments remain renderable
across every view. The list and detail YAML are joined through their explicit
`page.id` API fragments; authenticated desktop/mobile comparison captures are
temporary under `/tmp` and are not repository assets.

## Current batch: resilient empty, search, and permission states

Payment Tokens, Reconciliation, Invoice Analysis, Analytic Reporting, Partner
Reports, Taxes, and Statements now take their list sources from service-owned
API fragments keyed by `page.id`. Their ListViews declare route-specific search
labels/placeholders and Odoo-style no-record copy; Payment Tokens matches the
reference text `There is no token created yet.`. Report screens retain their
List/Pivot controls and apply the same search contract to both views.

Reconciliation keeps the invoice row visible beside a separate More-actions
column. Its Register payment server form is permissioned with `accounting.write`
and rejects zero, negative, and over-residual amounts with a visible validation
toast while preserving the form. The read sources require `accounting.read`,
and the Dispatcher role was checked against Payment Tokens at both required
viewports for the visible 403 state.

Authenticated Core3 checks covered all seven routes at 1440x900 and 390x844:
initial populated/empty state, nonsense search, report pivots, reconciliation
validation, and the denied Payment Tokens route. There were no unexpected
failures or page-level overflow. Temporary comparison captures are under
`/tmp/core3-accounting-followup-*` and `/tmp/odoo-accounting-followup-*`; no
images are repository assets. Dedicated datasource transport-error copy and
the remaining Accounting routes are outside this bounded batch.

## Current batch: deterministic transport and form-state boundaries

The report and configuration catalog sources from the resilient-state batch now
carry an explicit `fixture_state` contract. `fixture_state=empty` returns no
rows while retaining each route's Odoo empty-state copy; the normal request
continues to use the seeded query; and `fixture_state=transport_error` raises
the stable server error `Accounting data service is temporarily unavailable`.
The server-side source permission remains `accounting.read`, so a user without
that permission still receives the visible 403 page state before the fixture
query executes. The bounded route set is Payment Tokens, Reconciliation,
Invoice Analysis, Analytic Report, Partner Reports, Taxes and Fiscal,
Statement Reports, Chart of Accounts, Journals, Taxes, Payment Terms, and
Payment Methods. Tests execute the default, empty, and transport-error paths
against the Accounting migrations.

Invoice Detail is now layout-only with its datasource and mutations in the
page-ID API fragment. The existing Odoo form sheet exposes Invoice Lines and
Other Info notebook tabs, deterministic line summary fields, and a partner
select relation control backed by the seeded Accounting partner vocabulary.
Draft editing, posting, and payment guards remain server-side and retain their
existing permission boundary.

Authenticated desktop and mobile checks exercise the normal, empty-search,
fixture-empty, fixture-error, denied, invoice-tab, and partner-editor states;
captures remain temporary under `/tmp/core3-accounting-errors-next-*` and are
not repository assets.

## Current batch: Multi-Ledger configuration catalog

The live Accounting menu audit found Configuration → Accounting → Multi-Ledger,
backed by Odoo action `action_account_journal_group_list` at
`/odoo/multi-ledger`. Core3 now exposes the explicit route
`/accounting/multi-ledger`, with a page-owned API datasource and migration-backed
`accounting_journal_groups` table. The initial state intentionally remains empty
to match the fresh Odoo reference and uses its ledger-group columns, explanatory
copy, selection header, hidden empty pager, and an opt-in local inline
illustration. The create mutation defaults the company and sequence and rejects
duplicate ledger-group names within a company with HTTP 409.

Authenticated Core3 and Odoo captures were taken at 1440x900 and 390x844:
`/tmp/core3-accounting-multi-ledger-desktop-final.png`,
`/tmp/core3-accounting-multi-ledger-mobile-final.png`,
`/tmp/odoo-accounting-multi-ledger-desktop.png`, and
`/tmp/odoo-accounting-multi-ledger-mobile.png`. Both Core3 viewports returned
zero unexpected responses and no horizontal overflow. Odoo creates a new row
inline with list-level Save/Discard, while this bounded Core3 slice uses the
existing permissioned server-form create interaction; editing existing groups
and the excluded-journal many-to-many widget remain follow-up work.

## Next batch contract: vendor payments

The live Odoo 19 Invoicing menu audit recorded the next missing Accounting
surface before implementation: Vendors → Payments, menu XML ID
`account.menu_action_account_payments_payable`, at `/odoo/vendor-payments`.
The Vendors dropdown presents Bills, Refunds, Payments, Employee Expenses,
Products, and Vendors; Core3 already has the other bounded payment/document
surfaces but does not have an explicit vendor-payments route.

The desktop contract at `1440x900` is a populated `Vendor Payments` list with
`New`, followed by columns Date, Number, Journal, Payment Method, Vendor,
Amount, and State. On an initial transient/empty state Odoo may also show the
informational copy `Register a payment` and `Payments are used to register
liquidity movements. You can process those payments by your own means or by
using installed facilities.`; the populated reference capture used for this
batch did not render that copy.
The Odoo view switcher exposes List, Kanban, Graph, and Activity modes, and
the list contains ten deterministic demo rows plus a total amount footer.
The mobile contract at `390x844` opens the Kanban mode (`view_type=kanban`)
with one card per payment showing Vendor, Amount, Number, Date, and State;
the page has no horizontal overflow.

The desktop New action navigates to `/odoo/vendor-payments/new` and renders a
`Draft Payment` form with the statusbar Confirm, Paid, In Process, Draft;
Payment Type choices Send/Receive with Send selected; Vendor; Amount `$ 0.00`;
Date; Memo; Journal; Payment Method?; Vendor Bank Account; and the chatter
tabs Send message, Log note, and Activity. Odoo's current demo rows and form
were captured temporarily at `/tmp/odoo-accounting-vendor-payments-*.png`;
the images are evidence only and are not repository assets.

Core3 now exposes `/accounting/vendor-payments` under the Invoicing/Vendors
menu with a page-only layout and a separate `api/vendor-payments.yaml` joined
by `page.id`. Migration `20260911090000-014-accounting-vendor-payments.yaml`
seeds ten outbound vendor payments across the five Odoo states and normalizes
the earlier outbound demo payment to `Paid`. The datasource filters strictly
to outbound payments, formats dates as Odoo-style `Sep 10` values, and uses
the Odoo dollar amount presentation. The permissioned New mutation defaults
to an outbound Manual Payment, validates positive amounts, persists the
current date, and refreshes the list; the authenticated isolated browser
probe created `BILL/QA/0001` successfully.

Final temporary evidence is `/tmp/core3-accounting-vendor-payments-desktop-final.png`,
`/tmp/core3-accounting-vendor-payments-mobile-final.png`, and
`/tmp/core3-accounting-vendor-payments-desktop-new-final.png`, compared with
`/tmp/odoo-accounting-vendor-payments-desktop.png`,
`/tmp/odoo-accounting-vendor-payments-mobile.png`, and
`/tmp/odoo-accounting-vendor-payments-desktop-new.png`. Authenticated checks
covered 1440x900 and 390x844, exact-width no-overflow, populated list/cards,
New/save CRUD, search empty state, and zero failed responses after login.

The bounded limitation is that Core3 uses the existing server-form modal for
New instead of Odoo's full-screen Draft Payment sheet with statusbar,
vendor-bank-account field, and chatter; row navigation reuses the existing
read-only generic payment detail. A later payment-form slice can add those
controls without changing this vendor-list datasource boundary.

## Current batch: vendor payment form follow-up

Core3 now replaces that bounded modal/detail limitation with dedicated
layout-only `/accounting/vendor-payments/new` and
`/accounting/vendor-payment-detail` pages. Their API fragments join by
`page.id`, use Accounting-owned datasources/actions, and leave the shared
customer `/accounting/payments` and `/accounting/payment-detail` routes
unchanged. The forms provide the Odoo-shaped Draft Payment statusbar, Send /
Receive payment type, vendor, amount, date, memo, journal, payment method,
vendor bank account, currency, Other Info tab, and Send message / Log note /
Activity chatter controls. Existing vendor rows navigate to the dedicated
detail page; New is permissioned with `accounting.write`.

Migration `20260911150000-021-accounting-vendor-payment-form.yaml` adds the
vendor bank account column, an Accounting-owned message table, and explicit
bank-account fixtures for all ten vendor payments. Create, edit, confirm, paid,
cancel, and chatter actions enforce permissions, required/positive/date/type
validation, record existence, and row-version stale guards. The focused
integration suite exercises the in-memory create/edit/workflow/message path
and static page/API contracts.

Authenticated Core3 captures at 1440x900 and 390x844 are temporary evidence:
`/tmp/core3-accounting-vendor-payment-detail-next-desktop.png`,
`/tmp/core3-accounting-vendor-payment-form-next-desktop.png`,
`/tmp/core3-accounting-vendor-payment-detail-next-mobile.png`, and
`/tmp/core3-accounting-vendor-payment-form-next-mobile.png`. All four routes
returned zero unexpected failed responses and no horizontal overflow. The
authenticated owned Odoo comparison captures are
`/tmp/odoo-accounting-vendor-payments-next-desktop.png`,
`/tmp/odoo-accounting-vendor-payment-form-next-desktop.png`,
`/tmp/odoo-accounting-vendor-payments-next-mobile.png`, and
`/tmp/odoo-accounting-vendor-payment-form-next-mobile.png`; these also
returned zero unexpected failed responses and no horizontal overflow.
Odoo-specific vendor bank relation widgets, server-side accounting
reconciliation, and full activity scheduling remain outside this bounded
slice.

## Current batch: Secure Entries closing wizard

The live Odoo 19 menu/action audit found Accounting → Closing → Secure Entries,
menu action `account.action_view_account_secure_entries_wizard` (action 371).
Odoo opens the `account.secure.entries.wizard` form with the instruction
“Secure entries up to [date] inclusive, to make them immutable” and `Secure
Entries` and `Discard` actions.

Core3 exposes `/accounting/secure-entries` with a layout-only page joined to
`api/secure-entries.yaml` through `page.id`. Migration
`20260911100000-015-accounting-secure-entries.yaml` seeds a deterministic
company state. The read datasource requires `accounting.read`; the server-form
mutation requires `accounting.write`, records a bounded `2026-01-15` date, and
guards required, bounded, monotonic dates. This slice does not claim Odoo's
cryptographic hash-chain or database immutability. Authenticated comparison
captures are temporary under `/tmp` and are not repository assets.

## Current batch: Vendor Employee Expenses action

The owned Odoo 19 database exposes Vendors → Employee Expenses through menu XML
ID `hr_expense.menu_hr_expense_account_employee_expenses` (window action 599,
`/odoo/expenses-employee`). Core3 adds `/accounting/employee-expenses` with a
dedicated Accounting-owned table, separate page/API fragments joined by
`page.id`, List desktop and Kanban mobile modes, status filtering, search,
New, row navigation, and fixed comparison rows totaling `$737.80`.

Migration `20260910180000-016-accounting-employee-expenses.yaml` uses explicit
IDs and `2026-01-15` dates/timestamps. Read access requires `accounting.read`;
New requires `accounting.write`, with positive-amount, valid-date, and duplicate
description guards. Empty and transport-error paths are explicit, and browser
captures remain temporary outside the repository.

## Acceptance

- Every installed Odoo Accounting menu has an explicit Core3 route or a
  documented deliberate redirect.
- Authenticated desktop/mobile checks cover list, pivot, kanban, form,
  payment/reconciliation modal, settings, and denied/empty states.
- `bun run audit` passes and commits contain no images.

## Current batch: Reconciliation Models action

The installed Odoo `account` addon exposes `account.action_account_reconcile_model`
(`Reconciliation Models`, `/odoo/reconciliation-models`) even though the action
was not represented by a Core3 route. Core3 now provides
`/accounting/reconciliation-models` and `/accounting/reconciliation-model-detail`
with separate page/API YAML fragments joined by `page.id`. The migration seeds
four fixed models matching the owned Odoo demo (`Internal Transfers`, `Bank
Fees`, `Line with Bank Fees`, and `Owner's Current Account`) with explicit IDs,
fixed `2026-01-15` timestamps, Manual/Automated controls, and counterpart-item
fields.

The list supports authenticated search, Automation filtering, empty and
transport-error states, row navigation, and permissioned New. The detail form
supports permissioned edit, Manual/Automated transitions, archive, and delete;
duplicate active names and edits to archived records are rejected server-side.
Authenticated Odoo/Core3 desktop and mobile captures at 1440x900 and 390x844
are temporary under `/tmp/odoo-accounting-reconciliation-models-*` and
`/tmp/core3-accounting-reconciliation-models-*`; no screenshots are repository
assets.
## Current batch: Payment Providers action and list/form states

The installed Odoo 19 `account` action is Accounting → Configuration → Payment
Providers at `/odoo/accounting/payment-providers`. The owned reference exposes
24 providers, defaults to Kanban cards at desktop and mobile, and offers a List
view switch; cards show provider name, company, logo, and Install/Upgrade. The
Wire Transfer form is `/odoo/accounting/payment-providers/22` and shows the
provider title, logo, New, pager, and Install controls.

Core3 hardens the existing `/accounting/payment-providers` route. Its page is
layout-only and joins page-owned list/detail API fragments by `page.id`; the
shared ListView is card-first with a visible List tab, has no page-level New
action like the read-only Odoo list, and the detail uses OdooFormView. The API
keeps a permissioned create mutation for service contract and guard coverage,
but it is not exposed by this page. Migration `20260911130000-019-accounting-payment-providers.yaml`
seeds all 24 deterministic providers. Contracts cover search, empty, detail,
transport-error, permissioned CRUD, validation, duplicate/stale/missing guards,
and install/uninstall transitions. Final authenticated comparison captures are
temporary under `/tmp/odoo-accounting-payment-providers-*` and
`/tmp/core3-accounting-payment-providers-*`; screenshots are not repository
assets. Core3 uses a local Odoo image fallback for the deterministic fixture
cards and the existing server-form workflow; Odoo provider-specific setup
credentials and add-ons are outside this bounded slice.

## Current batch: Payment Terms configuration

The Odoo 19 reference exposes 11 deterministic Payment Terms rows at
`/odoo/payment-terms`, with `Payment Terms` and `Company` list columns. The
authenticated form also exposes Company, Early Discount, and Due Terms. Core3
now matches that bounded list contract with a company-aware catalog, stable
ordering, and fixtures for the observed day, month-end, installment, and early
discount examples.

`/accounting/payment-terms` remains layout-only and joins
`api/config-payment-terms.yaml` through `page.id`. The new
`/accounting/payment-term-detail` form similarly joins
`api/payment-term-detail.yaml` through `page.id`. Create, edit, archive,
restore, and delete require `accounting.write`; names, company, and due rules
are validated; duplicate, missing, and stale-row guards are server-side. Both
list and detail sources retain deterministic empty and transport-error states.

Focused integration coverage verifies the 11-row fixture order, search,
empty/detail/transport states, permission declarations, CRUD transitions,
validation, duplicate rejection, missing records, and optimistic concurrency.
This batch was implemented in a fresh isolated accounting worktree. The local
Odoo reference was reachable and authenticated headless browser inspection
confirmed the list/form contract; no screenshots are repository assets.

## Current batch: Vendor Products action

The authenticated owned Odoo 19 menu audit found the next uncovered installed
Accounting action at Vendors → Products, menu XML ID
`account.product_product_menu_purchasable`, `/odoo/vendor-products`. It is a
product Kanban by default at both required viewports, with a visible `New`
button, `Products` title, and `Purchase` mode label. The desktop List switch
shows Product Name, Internal Reference, Cost, Purchase Taxes, On Hand,
Forecasted, and Unit; mobile remains Kanban with no horizontal overflow.

Core3 adds `/accounting/vendor-products` as a separate Invoicing/Vendors menu
entry. The page-only layout joins `api/vendor-products.yaml` by page ID and
uses an Accounting-owned migration-backed table with ten deterministic rows,
Odoo-shaped card/list labels, search, Active/Archived filtering, and a
permissioned New action. Create, edit, archive, restore, and delete mutations
have Accounting write permission, duplicate/name validation, and optimistic
row-version guards. Empty and transport-error read states are explicit.

The bounded slice does not implement the full Odoo product form, variants,
vendor pricelists, purchase taxes relations, or stock-detail navigation; those
remain follow-up product-detail work. Authenticated Core3/Odoo desktop and
mobile captures are temporary under `/tmp` and are not repository assets.

## Current batch: customer Products Kanban parity

The recovered authenticated `core3_personal` Odoo reference confirms the
customer Products action as `account.product_product_menu_sellable` (action
373, `/odoo/customer-products`). At both `1440x900` and `390x844`, Odoo opens
the populated Sales product collection in Kanban, with `New`, product name,
variant count, price, and on-hand card fields; the desktop view also exposes
the List switch. Core3's existing `/accounting/products` counterpart now uses
the same Kanban-first responsive contract, Odoo-shaped card amount strings,
desktop List/Kanban tabs, and customer-product column labels.

The page remains layout-only and joins `api/products.yaml` by the matching
`page.id`. The Accounting-owned datasource now has deterministic formatted
price/stock fields, an explicit transport-error state, and server-side write
guards for permission, required names, duplicate names, and invalid
non-negative numeric values. The focused suite covers seeded/search/empty/error
reads and the guarded create path. Core3 and Odoo authenticated captures at
both required viewports are temporary under `/tmp`:
`accounting-customer-products-core3-{desktop,mobile}-final.png` and
`accounting-customer-products-odoo-{desktop,mobile}-final.png`.

The Odoo reference showed 153 demo products while this bounded Core3 fixture
surface retains its eight deterministic Accounting rows. Core3 browser DOM
checks confirmed the Kanban state, card fields, exact viewport width, and no
failed requests. The Core3 PNGs are provisional because the isolated dev
shell's launcher overlay remained visible in the screenshot despite the fully
rendered authenticated DOM; Odoo PNGs are populated visual evidence.

## Current batch: Vendor Product detail follow-up

The authenticated personal Odoo database confirms Vendors → Products uses the
`account.product_product_menu_purchasable` action at `/odoo/vendor-products`;
opening the deterministic `Bolt` record reaches `/odoo/vendor-products/128`.
The detail form exposes the Product, Sales, Expenses, Point of Sale, and
Purchase switches; General Information, Attributes & Variants, Sales,
Purchase, and Inventory tabs; product type, invoicing policy, inventory
tracking, sales price/taxes, cost, purchase taxes, category, reference,
barcode, company, inventory totals, internal notes, and chatter.

Core3 now opens vendor-product rows through
`view_accounting_vendor_product` to `/accounting/vendor-product-detail?id=...`.
The page is layout-only (`accounting-vendor-product-detail`) and joins
`api/vendor-product-detail.yaml` by the same `page.id`. Migration
`20260911190000-024-accounting-vendor-product-detail.yaml` adds deterministic
pricing, tax, inventory, reference, company, barcode, and notes fields to the
existing vendor-product fixtures. The detail read requires `accounting.read`
and has explicit empty, missing, and transport-error behavior. Edit, archive,
restore, and delete require `accounting.write`, validate required names and
non-negative prices, and use optimistic row-version guards; the list create
contract now also initializes the detail fields.

Focused coverage is `test/accounting_vendor_product_detail.integration.test.ts`
(3 tests, 33 assertions in this batch) plus the existing vendor-product suite.
Authenticated comparison captures are temporary and not committed:
`/tmp/core3-accounting-vendor-product-detail-desktop-final.png`,
`/tmp/core3-accounting-vendor-product-detail-mobile-final.png`,
`/tmp/odoo-accounting-vendor-product-detail-desktop-final.png`, and
`/tmp/odoo-accounting-vendor-product-detail-mobile-final.png`. Browser checks
covered the populated detail at 1440x900 and 390x844; Core3 and Odoo had no
unexpected HTTP error responses and no horizontal overflow.

The bounded Core3 form does not implement Odoo's product image, relational
variant/attribute editors, tax widgets, product-stat drilldowns, or chatter
timeline; its deterministic form presents the shared scalar fields and
permissioned lifecycle controls. Odoo's authenticated browser also reports
normal aborted lazy avatar/mail-image requests while the visible form remains
rendered.

## Current batch: Bills Analysis report action

The live personal `core3_personal` Odoo 19 database exposes the next uncovered
Accounting report action as `account.action_account_invoice_report_all_supp`
(window action 376). Its exact action label is `Bills Analysis`, its model is
`account.invoice.report`, its view modes are `graph,pivot`, and its live path is
`/odoo/vendor-bills-analysis`. The action is not menu-bound in this Community
demo, but is reachable from the installed Invoicing reporting surface. The
authenticated reference defaults to Graph at both `1440x900` and `390x844`,
shows the `Invoiced` and `Vendors` facets and `Measures` control on desktop,
and exposes the Pivot view with `Invoice Date`, `Product Category`, and
`Untaxed Amount` labels. Odoo's vendor report explanation is:
`From this report, you can have an overview of the amount invoiced from your
vendors. The search tool can also be used to personalise your Invoices reports
and so, match this analysis to your needs.`

Core3 adds the explicit Reporting menu entry `Bills Analysis` at
`/accounting/reports/vendor-bills-analysis`. The page-only
`pages/bills-analysis.yaml` is joined to `api/bills-analysis.yaml` through
`page.id: bills-analysis`; the read datasource requires `accounting.read` and
declares the stable `ACCOUNTING_DATA_UNAVAILABLE` transport error. Migration
`20260911200000-025-accounting-bills-analysis.yaml` owns four fixed August and
September 2026 vendor-bill/refund fixtures, including the observed
`Furniture / Office`, `None`, `Gemini Furniture`, and `Ready Mat` values. This
is a read-only report action, so no CRUD/workflow mutation is exposed; the
permission boundary, default query, search, empty, and transport-error paths
are covered by `test/accounting_bills_analysis.integration.test.ts`.

Authenticated comparison evidence is temporary and not committed:

- Odoo Graph: `/tmp/odoo-accounting-bills-analysis-desktop-final.png` and
  `/tmp/odoo-accounting-bills-analysis-mobile-final.png`.
- Odoo Pivot: `/tmp/odoo-accounting-bills-analysis-desktop-pivot-final.png` and
  `/tmp/odoo-accounting-bills-analysis-mobile-pivot-final.png`.
- Core3 Graph: `/tmp/core3-accounting-bills-analysis-desktop-final.png` and
  `/tmp/core3-accounting-bills-analysis-mobile-final.png`.
- Core3 Pivot: `/tmp/core3-accounting-bills-analysis-desktop-pivot-final.png`
  and `/tmp/core3-accounting-bills-analysis-mobile-pivot-final.png`.
- Core3 search-empty state: `/tmp/core3-accounting-bills-analysis-desktop-empty-final.png`
  and `/tmp/core3-accounting-bills-analysis-mobile-empty-final.png`.

The bounded implementation uses the shared Core3 Graph/Pivot renderer, so its
toolbar has the available Bar/Line controls rather than Odoo's Pie,
Cumulative, and sort controls. Core3 displays deterministic report amounts
from its owned fixtures rather than the live Odoo moving demo totals, and the
shared pivot formatter uses the current `vi-VN` decimal presentation. Core3's
scope facets include their field labels (`Invoiced: Invoiced` and
`Vendors: Vendors`), while Odoo renders the shorter facet labels. Odoo's
authenticated reference still reports the known aborted web-asset requests
`/web/assets/3270cb7/web.assets_web.min.js` and
`/web/assets/4a0b86f/web.assets_web_print.min.css`; the visible report rendered
and met the width checks.

## Current batch: Bank Accounts action

The live personal `core3_personal` Odoo database exposes Accounting action 371,
`Bank Accounts` (`res.partner.bank`, `list,form`), at `/odoo/action-371`.
The authenticated list contains six records and the observed columns are
`Account Number`, `Bank`, and `Send Money`. Opening the first record reaches
`/odoo/action-371/1`; its form exposes Account Number, Clearing Number,
Account Holder, Account Holder Name?, Bank, Send Money?, Company, Currency,
and Note. Odoo's New route is `/odoo/action-371/new`.

Core3 adds `/accounting/bank-accounts` and
`/accounting/bank-account-detail?id=accounting-bank-account-001`, with layout
YAML separated from page-ID-matched API fragments. Migration
`20260911210000-026-accounting-bank-accounts.yaml` owns six deterministic
rows copied from the observed contract, including BNP Paribas, ING, company,
currency, holder, and send-money states. Reads require `accounting.read`;
create, edit, and delete mutations require `accounting.write` and enforce
required account numbers/holders, duplicate protection, missing-record, and
optimistic row-version guards.

Focused validation is `test/accounting_bank_accounts.integration.test.ts`:
3 tests and 37 assertions passed after the mobile-column refinement. The
implementation commits are `a7d719a95b6ee108f35b8314d6d0fa886de11186` and
`c4591e65ff1d6ee64fc415259153d20f09481fe4`. The follow-up visual correction
marks Bank and Send Money? as mobile-visible; the shared table renderer still
uses a 760px internal table at 390px, so those two columns are clipped in the
Core3 mobile PNG even though the page-level scroll width remains 390px. This
bounded evidence records that remaining renderer-level visual difference.

Authenticated comparison captures were taken at 1440x900 and 390x844 and
remain outside Git:

- Odoo list: `/tmp/odoo-accounting-bank-accounts-desktop-list-20260911.png`
  (`ba33bbd21432a4bedf3316b8c8be35a5b162cb93de217145d5980774b7a15158`) and
  `/tmp/odoo-accounting-bank-accounts-mobile-list-20260911.png`
  (`950a866096c4210e4b8eb3d4c80a8de1c0fc08c0f0885e4986e35c39714ad24d`)
- Odoo form: `/tmp/odoo-accounting-bank-accounts-desktop-detail-20260911.png`
  (`c54816cd1859c66b037f3ea7befa2f284beec1e3a33ac8dfa4a82a54c2a9762`) and
  `/tmp/odoo-accounting-bank-accounts-mobile-detail-20260911.png`
  (`b3d676de5cd06d0aa76144a10513cb2a1d3fae2e8d5fd18935fe1ab3605feb58`)
- Core3 list: `/tmp/core3-accounting-bank-accounts-desktop-list-20260911.png`
  (`9287622ceb0128e24f68789f92e3bd9332af7ad5a82ddf19687fdd5816f0e040`) and
  `/tmp/core3-accounting-bank-accounts-mobile-list-20260911.png`
  (`1d1adae7250eb7b1ee09134a2861a4218f96eabce7eb034a24c956c0a99e04c9`)
- Core3 form: `/tmp/core3-accounting-bank-accounts-desktop-detail-20260911.png`
  (`fdc366a48b3d2b0106517b44b8cf95893b66eb5766a284821fd06bc1186a2eb5`) and
  `/tmp/core3-accounting-bank-accounts-mobile-detail-20260911.png`
  (`af4f734b36521b2917a6cf4faee306b4a1c21c9990d6617b8af80e6a232efef0`)

All eight authenticated routes rendered with no unexpected failed requests or
page-level horizontal overflow. The Odoo reference and Core3 list both show
six rows; the Core3 form presents the same scalar field contract, while Odoo's
employee relation/chatter presentation remains outside this bounded action.

## Current batch: Partner Ledger action

The live personal Odoo 19 database exposes the installed Accounting action
`account.action_account_moves_ledger_partner` (action 341), `Partner Ledger`,
at `/odoo/action-341`. Its model is `account.move.line` and its available view
modes are List, Pivot, and Graph. The authenticated list reference shows the
default facets `Posted`, `With residual`, `Payable or Receivable`, and `Partner`,
six partner groups, and the totals `$138,479.00` debit, `$87,027.27` credit,
and `$51,451.73` balance. The mobile reference stays in the compact List
presentation and clips secondary columns in the same way as the installed
Odoo responsive view.

Core3 adds `/accounting/reports/partner-ledger` as an explicit Reporting menu
entry. The page-only `pages/partner-ledger.yaml` joins
`api/partner-ledger.yaml` through `page.id: partner-ledger`; the API source
requires `accounting.read`, declares the stable
`ACCOUNTING_DATA_UNAVAILABLE` transport error, and supports the observed
partner search and three default filters. Migration
`20260911220000-027-accounting-partner-ledger.yaml` owns six deterministic
aggregate fixtures copied from the live reference, including entry counts and
debit/credit/balance totals. The focused suite covers page/API separation,
route discovery, idempotent seeding, search, filter-empty, fixture-empty, and
transport-error behavior.

Authenticated browser checks used Core3 `admin@tms.local` on the isolated
runtime at `http://localhost:3004` and Odoo `codex@core3.local` against
`core3_personal` at `http://localhost:8069`, at 1440x900 and 390x844. All
Core3 list and pivot captures had zero unexpected HTTP responses and exact
viewport width. The shared Core3 pivot renders the partner aggregate measures
without Odoo's date-period columns; that renderer limitation is recorded here
rather than presented as full pivot visual parity. Screenshots remain outside
Git.

Evidence and SHA-256 hashes:

- Odoo list desktop: `/tmp/odoo-accounting-partner-ledger-desktop-final-20260911.png` — `b9d50151367c354cff4dca319973e8a552c917ed452c5dda63c66c233fd0f9c4`
- Odoo list mobile: `/tmp/odoo-accounting-partner-ledger-mobile-final-20260911.png` — `15228e097e763b631b02d2bd565a832ce84c734f8744d07628dbc1435d6f67bd`
- Odoo pivot desktop: `/tmp/odoo-accounting-partner-ledger-desktop-pivot-final-20260911.png` — `8377d2838afbc9deb0d365325cf3fe86777193242f9762c1c7cd3363917fcacd`
- Core3 list desktop: `/tmp/core3-accounting-partner-ledger-desktop-final-20260911.png` — `f04cbc94f91ac07a3852f5b33c01190b8050e35dd382d6b5f7ebb6f83aafbb29`
- Core3 list mobile: `/tmp/core3-accounting-partner-ledger-mobile-final-20260911.png` — `02725b12491db6516ea48aa06b279308f67f85a1280c5bd7090ea4072f75319e`
- Core3 pivot desktop: `/tmp/core3-accounting-partner-ledger-desktop-pivot-final-20260911.png` — `68d4d4db40e0d36269e58a68382300acf5f45829f1774a86332db478abda78fc`
- Core3 pivot mobile: `/tmp/core3-accounting-partner-ledger-mobile-pivot-final-20260911.png` — `5992a4135c01e380250dfbf447e5a3ab25a4bade94469213b3d197d25b2fab49`

## Current batch: Journal Items graph and Kanban views

The live personal Odoo 19 menu audit resolved Review → Journal Items to the
`account.move.line` action at `/odoo/items` (current action 343). Its installed
view modes are List, Pivot, Graph, and Kanban. Desktop opens the dense List
view; the Graph view keeps a visible Balance axis and legend even when the
current balance values are all zero; and the Kanban view shows account,
label, date, and debit/credit amount cards. The responsive Odoo route opens
Kanban cards on the 390x844 mobile viewport.

Core3 now keeps the Journal Items page layout-only and joins
`api/journal-items.yaml` through `page.id: accounting-journal-items`. The API
projection supplies the Odoo card account, month bucket, net balance, DR/CR
direction, and formatted amount fields. The page declares the complete
desktop List/Pivot/Graph/Kanban action and a mobile-only card projection. The
current navigation-fidelity batch uses visible text tabs for the desktop
collection modes; Odoo's reference retains its top-right icon switcher. The shared
GraphView gained the opt-in `show_zero_data` contract so this action renders a
zero-valued Balance chart instead of incorrectly collapsing to `No data`.

Implementation commits are `254c8fa1` (view/API projection and focused
contract tests) and `22c6bf78` (zero-valued graph rendering and schema/client
support). Focused validation passed with 2 tests and 17 assertions; the shared
YAML schema suite passed with 16 tests. `bun run audit` passed with 465 pages,
472 routes, and 808 datasources, and `git diff --check` passed.

Authenticated browser QA used Odoo `codex@core3.local` against
`core3_personal` and Core3 `admin@tms.local`. It exercised desktop List,
Graph, and Kanban switching, the Graph Measures control (Debit then restored
to Balance), search-empty and search-restore, plus the mobile default card
state. All captures are temporary and no screenshots are repository assets.
Both runtimes returned no unexpected failed responses, the rendered widths
were exactly 1440 and 390 CSS pixels, and no horizontal overflow was observed.

Evidence captures and SHA-256 hashes:

- Odoo List desktop: `/tmp/odoo-accounting-journal-items-final-list-desktop-20260911.png` — `7245c4985b79a8b38f1a347ad5e4d120cb10fb554021a8375dbf527dc4dd9175`
- Odoo Graph desktop: `/tmp/odoo-accounting-journal-items-final-graph-desktop-20260911.png` — `d7ef8861ce3c8068368589e17556a57ef91527926dc056ce78bedfa18945bd2d`
- Odoo Kanban desktop: `/tmp/odoo-accounting-journal-items-final-kanban-desktop-20260911.png` — `e0c90344243604d534894331223b7a1a17db3e82f8783d7297f95de754bbb621`
- Odoo Kanban mobile: `/tmp/odoo-accounting-journal-items-final-kanban-mobile-20260911.png` — `62e215eab8ea981e5cb59255e6cd177509bd3431e96465850848bba1706503f7`
- Core3 List desktop: `/tmp/core3-accounting-journal-items-final-list-desktop-20260911.png` — `4633265a95f24fbc2d0b7dda9b951c92e2ce4c801dbfe2a48c2ec6e76c119e8b`
- Core3 Graph desktop: `/tmp/core3-accounting-journal-items-final-graph-desktop-20260911.png` — `a386349e26f87509421e4ca1ad9b4e42bfecdd91ac1d414676eb38d4c7075545`
- Core3 Kanban desktop: `/tmp/core3-accounting-journal-items-final-kanban-desktop-20260911.png` — `85c09ccbd8627c48b8e59ab3f7babb5360fa98e248d8d2f53502cfe18e2e61bd`
- Core3 Kanban mobile: `/tmp/core3-accounting-journal-items-final-kanban-mobile-20260911.png` — `4baf7be49d3f7a25b4b9810ed84347e15d5ebd50aa81d821c11af80c3eec0e51`

Each desktop capture is 1440x900 and each mobile capture is 390x844. The
primary mismatch found and fixed was Core3's missing Graph/Kanban modes and
its incorrect zero-balance `No data` state. Remaining bounded differences
are the live Odoo's 85 rows versus Core3's four deterministic review fixtures,
Odoo's purple shell and compact localized dates versus Core3's Fluent shell
and ISO dates, and the shared Core3 mobile card styling/fixture density.

## Current batch: Payment Tokens action

The installed Odoo 19 source confirms `payment.action_payment_token` as the
Payment Tokens window action with `list,form` modes. Its list is create-disabled
and exposes Payment Details, Partner, Payment Method, Provider, Provider
Reference, and Company. Its form is both create- and edit-disabled, with
General Information and Technical Information groups; the source also defines
an Archived search filter and a conditional Payments stat action. The normal
authenticated personal menu hides Payment Tokens and Payment Transactions
behind `base.group_no_one`; authenticated developer-mode reference QA at
`/odoo/payment-tokens?debug=1` exposed both actions. The reference database had
no token records, so its Odoo captures intentionally show the installed empty
state.

Core3 implements `/accounting/payment-tokens` and the read-only
`/accounting/payment-token-detail` page as separate YAML page/API fragments
joined by `page.id`. The migration owns deterministic active and archived
masked-token fixtures shaped like Odoo's payment.token fields. The list
defaults to active records, supports partner/provider search and Archived
filtering, and opens the read-only form. Server-side actions are limited to
accounting.write archive, restore, and delete contracts with required
row-version concurrency, missing-record guards, restore validation for
inactive providers/payment methods, and transport/missing/empty states. Token
creation and editing are deliberately absent because Odoo's installed action
sets `create="false"` and `edit="false"`.

Authenticated comparisons used Odoo `codex@core3.local` in `core3_personal`
and Core3 `admin@tms.local`. Screenshots remain outside Git:

- Odoo empty list desktop: `/tmp/odoo-accounting-payment-tokens-20260911/desktop.png` — `aaa73a54d16bd40208f1131e9983a2609f1f1bc8eaad0c9435c83f95a3c298e0`
- Odoo empty list mobile: `/tmp/odoo-accounting-payment-tokens-20260911/mobile.png` — `8dfd7f0587cfd217ba8366aac00c63e0090b0ee4e9526e7fe633164b592ed0d2`
- Core3 seeded list desktop: `/tmp/core3-accounting-payment-tokens-20260911/list-final-desktop.png` — `153984de0ee91c3314e519f141fc452484656d23de0c8c12d62b29930df530eb`
- Core3 seeded list mobile: `/tmp/core3-accounting-payment-tokens-20260911/list-final-mobile.png` — `395af4b661af23e5270a89374985742d1cea4ff48d8b9afe7db81711e14cd316`
- Core3 read-only detail desktop: `/tmp/core3-accounting-payment-tokens-20260911/detail-final-desktop.png` — `a82634dc11e9d58a345aa982516b218fef8639128a15b897d5bff4e05dcbe2b4`
- Core3 read-only detail mobile: `/tmp/core3-accounting-payment-tokens-20260911/detail-final-mobile.png` — `8242642948fe6a4d4b0ae23b1cf9f7aa7398dc48b90be2137586da7020cb2253`

The four desktop/mobile viewport captures are exact 1440x900 and 390x844.
Authenticated Core3 list-to-detail navigation returned no failed requests or
page errors and measured `scrollWidth === clientWidth` at both viewports. The
remaining visual differences are the empty Odoo reference versus seeded Core3
review data, Odoo's purple shell versus Core3's Fluent shell, and shared
renderer differences in navigation density and mobile column clipping. The
conditional linked-Payments stat and the separately visible Payment
Transactions action are deferred to a later transaction batch; no transaction
behavior is claimed here.

## Current batch: Payment Transactions action

The installed Odoo 19 source confirms `payment.action_payment_transaction` as
the Payment Transactions window action with `list,kanban,form,graph,pivot`
modes. Its list is create-disabled and exposes Reference, Created on, Payment
Method, Provider, Customer, Partner Name, Amount, Status, Company, and the
optional Production Environment field. Its form is create- and edit-disabled,
with a transaction-details group, customer-address group, statusbar, and
conditional Capture/Void/Post-process controls. The model access CSV grants
these records only to `base.group_system`. Authenticated developer-mode QA in
the personal `core3_personal` database confirmed the action is visible at
`/odoo/payment-transactions?debug=1`, but the database contains no transaction
records, so Odoo renders its empty state and provides no source-confirmed row
workflow to exercise.

Core3 implements the smallest bounded source-confirmed surface: a separate
`/accounting/payment-transactions` list/API and read-only
`/accounting/payment-transaction-detail` form/API joined by `page.id`. The
list declares Odoo's list, Kanban, Graph, and Pivot modes and exact source
fields; the migration seeds six fixed transactions covering Draft, Pending,
Authorized, Confirmed, Canceled, and Error. Search, empty, missing, forbidden,
and transport states are explicit. Creation, editing, Capture, Void, and
Post-process are deliberately deferred because Odoo's installed form forbids
create/edit and the authenticated reference has no transaction/provider data
with which to validate external payment workflows.

Authenticated comparisons used Odoo `codex@core3.local` in `core3_personal`
and Core3 `admin@tms.local`. All screenshots remain outside Git. The Odoo
detail view is unavailable in the empty reference; Core3 detail captures are
paired with the Odoo empty list to make that limitation explicit.

Evidence captures and SHA-256 hashes:

- Odoo empty list desktop: `/tmp/odoo-payment-transactions-auth-desktop-1440x900-20260911.png` — `e4f2d8a5d3fff0fe3e7e1cc1867ccce92bac41d7075b0651fe2aebfcb5a9b313` — 1440x900
- Odoo empty Kanban mobile: `/tmp/odoo-payment-transactions-auth-mobile-390x844-20260911.png` — `ba423c9b8fea796cb9c1a4e451d3dd5e15674a872e6a49894b03cea92b748e27` — 390x844
- Core3 seeded list desktop: `/tmp/core3-accounting-payment-transactions-20260911/desktop-list.png` — `047f358ee05124c3996bfaf34523e490040060590d9a499174f0d92725ea967c` — 1440x900
- Core3 read-only detail desktop: `/tmp/core3-accounting-payment-transactions-20260911/desktop-detail.png` — `38b0fb79f9259b38c1fe2a63093cea1b35e2326f87b7189257511d14401b0613` — 1440x900
- Core3 seeded responsive list: `/tmp/core3-accounting-payment-transactions-20260911/mobile-list.png` — `b79cd9337520b9faf36dd2334eb27f0392dd39ea928b1cd16f472b823b6545b9` — 390x844
- Core3 read-only detail mobile: `/tmp/core3-accounting-payment-transactions-20260911/mobile-detail.png` — `4a50281fc7bc462b448cd9962bcb846e6b186196b4cea2e19a5a581ad9906799` — 390x844

The inspected pairs matched the source labels, status states, fixed fixture
values, and read-only detail layout. Core3 returned no failed responses or
page errors; body width equaled the viewport at 1440 and 390 pixels for both
list and detail. Remaining differences are Odoo's purple shell versus Core3's
Fluent shell, Odoo's empty mobile Kanban versus Core3's seeded responsive list,
Core3 ISO timestamps versus Odoo localized dates, and lower-level Odoo
relational widgets/chatter not included in this bounded read-only slice.

## Linked payment transaction workflow follow-up (2026-09-11)

The payment transaction detail now exposes the source-confirmed linked state:
an unlinked transaction can be opened, a linked payment reference can be
applied with the required row version, and the resulting payment reference is
shown after reload. The bounded workflow is implemented as a service-owned
state transition; Capture, Void, and Post-process remain deferred because the
authenticated Odoo reference had no transaction/provider rows with which to
validate those controls.

Authenticated Core3 browser evidence covered the list, unlinked detail, and
linked detail at 1440x900 and 390x844 with no failed requests/page errors and no
horizontal overflow. Odoo's authenticated empty-state reference captures are
`/tmp/odoo-payment-workflow-empty-desktop-1440x900-20260911.png` and
`/tmp/odoo-payment-workflow-empty-mobile-390x844-20260911.png`. Core3 captures
remain outside Git:

- `/tmp/core3-accounting-payment-workflow-20260911/linked-desktop-1440x900.png`
  — 1440x900 — `8d057f6149c767177b974bde6c57f8117430bae115193b4a8eb2190ddf9ed5e3`
- `/tmp/core3-accounting-payment-workflow-20260911/linked-mobile-final-390x844.png`
  — 390x844 — `83cc0bc718438bcdadc0c9fee292c530d85ecad6068875c19c63edd9b30c9387`
- `/tmp/core3-accounting-payment-workflow-20260911/unlinked-desktop-1440x900.png`
  — 1440x900 — same desktop digest as the linked capture
- `/tmp/core3-accounting-payment-workflow-20260911/unlinked-mobile-390x844.png`
  — 390x844 — same mobile digest as the linked capture

## Current batch: Internal Transfers action 324

The fresh owned Odoo 19 reference confirms `account.action_account_payments_transfer`
(`Internal Transfers`, action 324, model `account.payment`) with list, Kanban,
form, and graph modes. It is opened from the journal dashboard with the transfer
filter and outbound payment context. Its list uses Date, Number, Journal, Payment
Method, Vendor, Amount in Currency, Amount, and State, and its form uses the
Payment, Payment information, Other Info, and chatter sections. The new
`core3_codex_demo` database currently has no rows matching Odoo's transfer filter,
so the authenticated reference renders its exact empty-state helper over the
generic payment rows; this is recorded as a source-data limitation rather than
silently treating generic payments as transfers.

Core3 implements the bounded YAML-first surface at `/accounting/internal-transfers`,
`/accounting/internal-transfer-detail`, and `/accounting/internal-transfers/new`.
Page and API fragments are separate. The migration seeds four stable rows across
Draft, In Process, Paid, and Canceled. List, card/Kanban, graph, read-only detail,
new/edit, Confirm, Paid, Cancel, search, empty, stale-write, validation,
permission, message, note, and activity states are explicit. Paired accounting
entries and external payment processing remain outside this UI batch.

Authenticated evidence used the fresh Odoo database (`core3_codex_demo`) and the
isolated Core3 runtime. All images remain outside Git:

- Odoo desktop list: `/tmp/odoo-codex-internal-transfers-desktop-empty-final-20260911.png`
  — 1440x900 — `8546d9bd3d606d7317d7dfc7f7f2fedc632e95a8229f3a5db22c20133d0126d47`
- Odoo mobile Kanban: `/tmp/odoo-codex-internal-transfers-mobile-final-20260911.png`
  — 390x844 — `a4ba8f13fc112a767f41a296d522426d8a53b1df6b43650dcbf26540596f26d6`
- Core3 desktop list/detail/new: `/tmp/core3-accounting-internal-transfers-desktop-{list,detail,new}-final-20260911.png`
  — 1440x900 — hashes `f062da27de8cbb68319f429f2debb4b3a48ccadf4b807c9a7b87458d28dc63fa`,
  `0d219ec02daa3f93eeb905145d23f71c764059d8f8317340c1c5970f35b9e388`, and
  `52e9829217b3d1bf7a64045b4137369503b9ff77841a04283211b17d7`
- Core3 mobile list/detail/new: `/tmp/core3-accounting-internal-transfers-mobile-{list,detail,new}-final-20260911.png`
  — 390x844 — hashes `59ba25167b32e36f7132bcea88f9cb4e9320e9a764b4366e63f662eb3766b435`,
  `8da6659771364d807d8a5132c1351e2a7ec02b173626308e863737639e85829a`, and
  `967f27e4db196605f92d3a6414d92d2ea31efde1f54db3a34ab6c549bd300fd6`

The Core3 captures had no page errors, no failed requests, and document/body
width equal to the viewport at both sizes. The remaining visible differences are
the expected Odoo purple shell versus Core3 Fluent shell, Odoo's empty filtered
reference versus deterministic Core3 transfer fixtures, and compact mobile action
overflow behavior; these are documented limitations, not unverified claims.

Focused validation passed: 3 tests and 21 assertions, YAML audit (492 pages,
499 routes, 862 datasources), ESLint, global Sass build, and `git diff --check`.

## Next batch contract: Internal Transfers action

The authenticated Odoo 19 source and `core3_personal` database identify the
next uncovered payment action as `account.action_account_payments_transfer`
(window action 324), titled `Internal Transfers`. It targets
`account.payment`, declares `list,kanban,form,graph`, an empty domain, and the
context `default_payment_type=outbound`, `search_default_transfers_filter=1`,
and `display_account_trust=True`. The action has no direct `ir.ui.menu`
binding in the installed database; it is opened from an Accounting journal
dashboard through `account.journal.open_payments_action(payment_type='transfer')`.
The source path exposed by the Odoo web client is `/odoo/action-324`.

The list uses primary view `account.supplier.payment.list`, which inherits
`account.payment.list` and renames `partner_id` to `Vendor`. It is
`edit="false"`, has a list-header `Confirm` action, and exposes Date, Number,
Journal, Payment Method, Vendor, Amount in Currency, Amount, and State. The
action's view modes are List, Kanban, Form, and Graph; the installed mobile
client switches to Kanban with cards containing journal/partner, amount,
number, date, activity, and state. The list has `New`, and the Odoo empty
help copy is `Register a payment` followed by `Payments are used to register
liquidity movements. You can process those payments by your own means or by
using installed facilities.`

The source form is `account.payment.form`. Its visible header is Confirm with
the Draft, In Process, and Paid statusbar. The rendered new-record contract
shows title `Draft Payment`, `Payment Type?` with Send/Receive radio choices
(Send selected), `Customer?`, `Amount?`, `Date?`, `Memo?`, `Journal?`,
`Payment Method?`, `Customer Bank Account?`, and the chatter controls `Send
message`, `Log note`, and `Activity`. The account-payment access rows grant
read to the Accounting read-only group and full read/write/create/delete to
the Invoicing group; the Core3 mapping is `accounting.read` for reads and
`accounting.write` for New, edit, workflow, and chatter mutations.

The owned live reference currently has no paired internal-transfer records.
Because the installed action's `transfers_filter` context does not correspond
to a named filter in its installed search view, Odoo renders the two available
customer payments (`PBNK1/2026/00001` and `PBNK1/2026/00002`) in this action.
The authenticated evidence is `/tmp/odoo-accounting-internal-transfers-desktop-1440x900-final.png`
(`000bceea992d39c17f94e4d5a8b46cbc813de917336a7cff7f3bce985b361ea8`) and
`/tmp/odoo-accounting-internal-transfers-mobile-390x844-final.png`
(`793592755408120709fc947fba7f1d5891b9f16f7ce1c17bd5a99f80c54fd263`), both
with exact viewport widths and no failed requests. The exploratory unsaved
draft created while inspecting New was removed from the reference database.

Core3 implementation now adds `/accounting/internal-transfers`,
`/accounting/internal-transfer-detail`, and
`/accounting/internal-transfers/new` under the Invoicing/Accounting payment
surface. Page YAML will contain layout only; list, detail, options, chatter,
and mutations will be owned by page-ID-matched API fragments. The migration
will seed explicit paired-transfer-shaped rows with stable dates, journals,
amounts, and Draft/In Process/Paid/Canceled states. The bounded workflow is
New/save, edit while Draft, Confirm (Draft → In Process), Paid (In Process →
Paid), Cancel (Draft/In Process → Canceled), and chatter; every mutation will
require `accounting.write`, validate positive amount/date/journal/payment
method, and enforce missing-record and expected-row-version guards. Empty,
transport-error, denied, search-empty, and stale states are acceptance cases.
The Core3 form preserves the source's customer/payment fields because that is
what the installed Odoo action renders; destination-journal and cryptographic
paired-entry behavior are outside this UI slice.

## Current batch: Accounting ListView navigation fidelity (2026-09-11)

The fresh authenticated Odoo 19 reference was checked in database
`core3_codex_demo` at `http://localhost:8069` before changing the Core3
contracts. The installed actions and rendered desktop labels were:

- Payment Transactions, action 310: `list,kanban,form,graph,pivot`; visible
  labels `List`, `Kanban`, `Graph`, `Pivot`.
- Employee Expenses, action 675: `list,kanban,form,pivot,graph`; visible
  labels `List`, `Kanban`, `Pivot`, `Graph`.
- Review → Journal Items, action 343 (the installed 335/336 variants expose
  the same collection modes): `list,pivot,graph,kanban`; visible labels
  `List`, `Pivot`, `Graph`, `Kanban`.
- Vendor Payments, action 323: `list,kanban,form,graph,activity`; visible
  labels `List`, `Kanban`, `Graph`, `Activity`.

Core3 now explicitly declares `view_navigation: tabs` for the four matching
Accounting ListViews: `/accounting/payment-transactions`,
`/accounting/employee-expenses`, `/accounting/journal-items`, and
`/accounting/vendor-payments`. The Payment Transactions Kanban view is no
longer mobile-only, so its desktop text tab is present as in the source
action. The page/API boundary remains intact: these changes touch only page
navigation contracts and their corresponding tests; no API YAML was moved or
embedded in a page YAML.

Authenticated browser evidence used Odoo `codex@core3.local` and Core3
`admin@tms.local`, with fixed `1440x900` desktop and `390x844` mobile
viewports. Every capture reported zero `requestfailed` and zero `pageerror`;
body and document widths were exactly 1440 and 390 respectively. Core3
rendered six payment transactions, four employee expenses, four journal items,
and eleven vendor-payment rows on desktop; mobile rendered the corresponding
responsive data cards. Odoo rendered four employee expenses, 77 journal items,
and ten vendor-payment records; Payment Transactions has no records in the
reference database. Odoo naturally switches to Kanban cards on mobile and
hides its desktop view switcher. Its Vendor Payments route also shows the
source `Register a payment` helper over the populated demo rows; this is
retained as an observed reference-state limitation.

Final comparison captures and SHA-256 hashes (all temporary and outside Git):

- Payment Transactions — Odoo desktop
  `/tmp/accounting-navigation-fidelity-20260911/odoo-payment-transactions-desktop.png`
  — `def35435224603ff35e9e449e9bade3362afdf2aecd536778da6d7dac3d6c752`;
  Odoo mobile
  `/tmp/accounting-navigation-fidelity-20260911/odoo-payment-transactions-mobile.png`
  — `2f2f5f0d33ed119a4e7f3b0489956432a3338d87c9df628e827ce3e8cb5b4951`;
  Core3 desktop
  `/tmp/accounting-navigation-fidelity-20260911/core3-payment-transactions-desktop.png`
  — `ec6993ae7edda3aa381b34d91a54b4f96ebce68cd5298829cc5be673ed6cc907`;
  Core3 mobile
  `/tmp/accounting-navigation-fidelity-20260911/core3-payment-transactions-mobile.png`
  — `8228dac30324b8e03c600d6dd8a73ab85a9b2711efa8c5316f4e6e3709ad616e`.
- Employee Expenses — Odoo desktop
  `/tmp/accounting-navigation-fidelity-20260911/odoo-employee-expenses-desktop.png`
  — `10147f5dca2b15e07534c28fcfe87043ed5e184964bc805ba2dc4119dea69aad`;
  Odoo mobile
  `/tmp/accounting-navigation-fidelity-20260911/odoo-employee-expenses-mobile.png`
  — `dcfc4a38a1c806811ce8621123e28ed212ca91ba40a9ba3702e0b104da9bd39f`;
  Core3 desktop
  `/tmp/accounting-navigation-fidelity-20260911/core3-employee-expenses-desktop.png`
  — `15ebdaf79e2c1c1d998b3cc4b4181c0e87b2a9f59967779e924f93aeac09b3f4`;
  Core3 mobile
  `/tmp/accounting-navigation-fidelity-20260911/core3-employee-expenses-mobile.png`
  — `d8c4adc9e946f237c8490a38c1268216eab78c070c199e6ec3ba570370955bdf`.
- Journal Items — Odoo desktop
  `/tmp/accounting-navigation-fidelity-20260911/odoo-journal-items-desktop.png`
  — `1fe4d1bef8e3c3a2fdb01fbdeaafe9d939a585e5446da9214d8dd8912861bf7b`;
  Odoo mobile
  `/tmp/accounting-navigation-fidelity-20260911/odoo-journal-items-mobile.png`
  — `48281227eedc57858c9a8e1a3cc4778cb45bcdf6e9decb3e41d9ce216894816f`;
  Core3 desktop
  `/tmp/accounting-navigation-fidelity-20260911/core3-journal-items-desktop.png`
  — `8de0041432ee7d07fc1ecc43c07f8ef4cdbac05717709a3bce664d46a5b572cd`;
  Core3 mobile
  `/tmp/accounting-navigation-fidelity-20260911/core3-journal-items-mobile.png`
  — `05d2a73700bfc885af656a1afdcf90535da0131f781931e50c278929f9be0e2b`.
- Vendor Payments — Odoo desktop
  `/tmp/accounting-navigation-fidelity-20260911/odoo-vendor-payments-desktop.png`
  — `66499cc2decde2d3657c39002f36e8d2d0359c5c8abef213d92d64f3cbcef490`;
  Odoo mobile
  `/tmp/accounting-navigation-fidelity-20260911/odoo-vendor-payments-mobile.png`
  — `016dadda789a3339be437988054f0d540655e3e3449c23cdf1f497381635155a`;
  Core3 desktop
  `/tmp/accounting-navigation-fidelity-20260911/core3-vendor-payments-desktop.png`
  — `dd7ee1e30ce5e1ea6449cdd1d58218093f23cb538c0f6914be45b40facc9b81a`;
  Core3 mobile
  `/tmp/accounting-navigation-fidelity-20260911/core3-vendor-payments-mobile.png`
  — `d706263a8a3b19154807e050619723fd5bddf089050a8759a495753e14d9c1de`.

Final focused validation passed: 11 tests and 93 assertions across the four
Accounting contracts; `bun run audit` passed with 498 pages, 505 routes, and
879 datasources; ESLint, the global Sass rebuild, and `git diff --check` also
passed. Implementation/test commits are `22a2b896` and `bcf8df22`; this
evidence update is committed separately.

## Current batch: Bank Statements action (2026-09-11)

The fresh Odoo 19 source is `account.action_bank_statement_tree` in
`addons/account/views/account_bank_statement_views.xml` (action name `Bank
Statements`, model `account.bank.statement`, view modes `list,pivot,graph,form`,
and domain `journal_id.type = bank`). The rendered list is
`account.bank.statement.list`, the search view is
`account.bank.statement.search`, the pivot is `account.bank.statement.pivot`,
and the graph is `account.bank.statement.graph`. The visible entry is the
Accounting journal dashboard's `Statements` object action in
`account_journal_dashboard_view.xml`; the authenticated web-client route was
`/odoo/action-417` in `core3_codex_demo`.

Core3 adds the module-qualified route `/accounting/bank-statements` and the
row detail route `/accounting/bank-statement-detail`, with presentation-only
page YAML joined to API YAML by `page.id`. The list preserves the Odoo labels
`Reference`, `Date`, `Journal`, `Company`, `Starting Balance`, and `Ending
Balance`, plus List/Pivot/Graph tabs, Empty/Invalid filters, search, row
navigation, and the Odoo registration empty copy. The read-only detail keeps
the Statement and Accounting groups and Statement lines/Attachments notebook
tabs. The migration is deterministic and idempotent, and the API contract
covers accounting.read, forbidden/transport/missing states, search, empty
filters, and stable row data.

Authenticated evidence used the isolated runtime (`3051`/`3052`) after global
and Accounting Sass rebuilds. Every saved capture was viewport-bounded, waited
for visible seeded content, checked document/body width equality, and reported
no failed responses or page errors. Images remain outside Git:

- Desktop list: `/tmp/core3-accounting-bank-statements-desktop-final-20260911.png`
- Desktop pivot: `/tmp/core3-accounting-bank-statements-desktop-pivot-final-20260911.png`
- Desktop graph: `/tmp/core3-accounting-bank-statements-desktop-graph-final-20260911.png`
- Desktop detail: `/tmp/core3-accounting-bank-statements-desktop-detail-final-20260911.png`
- Mobile list: `/tmp/core3-accounting-bank-statements-mobile-final-20260911.png`
- Mobile detail: `/tmp/core3-accounting-bank-statements-mobile-detail-final-20260911.png`

The remaining visual differences are the expected Core3 Fluent shell versus
Odoo's purple shell, compact mobile navigation hiding Odoo's desktop
breadcrumbs/view controls, and the bounded fixture rows versus the live Odoo
database's current bank-statement population.

## 2026-09-12 Bank Statements active-reference refresh

The replacement Odoo stack resolves the same XML action to runtime action 341
in `core3_codex_demo_20260912` at `http://localhost:8073`. The authenticated
source contains two Bank journal statements and renders List, Pivot, Graph,
and read-only form states at the required desktop/mobile sizes.

The paired browser pass found and fixed a Core3 runtime contract defect: the
page declared Pivot fields, but the service-owned
`accounting_bank_statements` datasource did not. Selecting Pivot or Graph
therefore raised `Datasource does not declare pivot fields`. The datasource
now declares `statement_month`, `starting_balance`, and `ending_balance`; the
focused test asserts the contract, and the authenticated fixed run reports
zero page errors and zero failed requests in all exercised states.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Bank Statements list | 1440x900 | `/tmp/odoo-accounting-bank-statements-list-desktop-1440x900-20260912.png` | `04fb6a3e6664cdc5b09ce92e088702ddba0f4fbeae516fa906034c806722a3b6` |
| Odoo Bank Statements pivot | 1440x900 | `/tmp/odoo-accounting-bank-statements-pivot-desktop-1440x900-20260912.png` | `a93e12a5a227d24e5d327f17c9fa0cb4548c5bb3a34d1862f180474c34dee57d` |
| Odoo Bank Statements graph | 1440x900 | `/tmp/odoo-accounting-bank-statements-graph-desktop-1440x900-20260912.png` | `a8a8692ef08eb630743b8060a0e3ecf38782d73de2ac430a3976d6cb7b066b62` |
| Odoo Bank Statement form | 1440x900 | `/tmp/odoo-accounting-bank-statement-form-desktop-1440x900-20260912.png` | `dfe7d81226ea0ff602fd40671fe818eeba80da37d07dfcd2f5989a822995c47f` |
| Odoo Bank Statements list | 390x844 | `/tmp/odoo-accounting-bank-statements-list-mobile-390x844-20260912.png` | `0d6b320938db6f7046a98e2e738eb5bbb470781236d2ff489c6fb2f5de096fec` |
| Odoo Bank Statement form | 390x844 | `/tmp/odoo-accounting-bank-statement-form-mobile-390x844-20260912.png` | `fbe83bd0ee1c3084020dbc2f0aabe7c670db4cf1cf94362e26050b206fa77300` |
| Core3 Bank Statements list | 1440x900 | `/tmp/core3-accounting-bank-statements-list-fixed-desktop-1440x900-20260912.png` | `d67f36e51d55e699ac9a5ff3d5672ade044d173eb0d41ef66ed36e39d1c92908` |
| Core3 Bank Statements pivot | 1440x900 | `/tmp/core3-accounting-bank-statements-pivot-fixed-desktop-1440x900-20260912.png` | `2d9feed655e312128c546d037ccec3b124d832c70cda27c2eb88b762369d4d5d` |
| Core3 Bank Statements graph | 1440x900 | `/tmp/core3-accounting-bank-statements-graph-fixed-desktop-1440x900-20260912.png` | `1f92676f913a195a707500d149ded8911f760305c3e802bf02c3b1e4582d6402` |
| Core3 Bank Statement form | 1440x900 | `/tmp/core3-accounting-bank-statement-form-fixed-desktop-1440x900-20260912.png` | `6e27210936fd912d6d3ffcf9516edecae42c2412759a38bb93a89113c8201281` |
| Core3 Bank Statements list | 390x844 | `/tmp/core3-accounting-bank-statements-list-fixed-mobile-390x844-20260912.png` | `a1b4ad78952ad18becedc644cfd66fa0f1c1bb2635b3afbd7bca5d62339e64fd` |
| Core3 Bank Statement form | 390x844 | `/tmp/core3-accounting-bank-statement-form-fixed-mobile-390x844-20260912.png` | `c757429ae14a36e4966a6457ffd5c8d016ac5b476847ad52cae8e65c63c38aab` |

The fixed batch passes 2 tests and 26 assertions, the audit passes with 545
pages, 552 routes, and 947 datasources, ESLint and the frontend build pass,
and `git diff --check` is clean. The expected residual is the shared Fluent
shell and Core3's compact pivot/graph rendering versus Odoo's purple shell and
formatted accounting pivot. Screenshots remain outside Git.

## Cash Registers bounded slice (2026-09-12)

Core3 adds the Accounting Cash Registers action at `/accounting/cash-registers`
with a page/API pair joined by `page.id`, deterministic register fixtures, and
read-only `accounting.read` access. The focused contract covers list/search,
empty/error/denied states, stable ordering, and the cash-register action
navigation.

The focused integration test passes 2 tests and 13 assertions. Authenticated
Core3 and Odoo captures were saved at 1440x900 and 390x844 under
`/tmp/core3-odoo-parity/accounting-next-20260912/`; images remain outside Git.
The comparison confirms the bounded list surface and responsive width. The
remaining differences are the shared Core3 Fluent shell versus Odoo's purple
shell and deterministic Core3 fixtures versus the live Odoo dataset. No
cash-session posting or reconciliation workflow is claimed by this slice.

## Credit Statements bounded action (2026-09-12)

The bounded live Odoo 19 discovery pass against
`core3_codex_demo_20260912` identified the uncovered source action
`account.action_credit_statement_tree`, titled `Credit Statements`. It is
distinct from the existing Bank Statements and Cash Registers actions: the
source targets `account.bank.statement` with `journal_id.type = credit`, uses
the shared statement list/search views, and exposes List, Pivot, and Graph
modes. Its empty copy explains that a credit statement summarizes transactions
on a credit account and can be reconciled to invoices.

Core3 adds `/accounting/credit-statements` as a YAML-first page/API pair joined
by `page.id`, with the Odoo Reference, Date, Journal, Company, Starting Balance,
and Ending Balance columns, Empty/Invalid filters, List/Pivot/Graph tabs, and
responsive cards. Migration
`20260912040000-034-accounting-credit-statements.yaml` seeds three stable
credit-journal rows, including an empty-line and invalid fixture. The source
requires `accounting.read`; default, search, filter-empty, fixture-empty,
transport-error, forbidden, and idempotent migration paths are covered by the
focused integration test. This source action has no Odoo form or write workflow,
so CRUD mutations are deliberately not exposed; the applicable list/report
states are covered exactly.

Authenticated Odoo/Core3 comparison was attempted at 1440x900 and 390x844
under `/tmp/core3-odoo-parity/accounting-batch4-20260912/`. The Odoo action is
not directly menu-bound in the installed database and the paired Core3 runtime
was unavailable during this bounded implementation pass; exact runtime limits
and any resulting screenshot omissions are recorded in the handoff.

## Credit Statements bounded slice (2026-09-12)

Core3 adds the source-supported Credit Statements action at `/accounting/credit-statements`, with separate page/API YAML joined by `page.id`, deterministic credit rows, read-only accounting permissions, filter/search/empty/transport states, and a bounded credit-only action contract. The focused test passes 2 tests and 17 assertions.

The active Odoo action was source-confirmed, but it was not directly menu-bound in the installed reference. Odoo desktop/mobile captures are under `/tmp/core3-odoo-parity/accounting-batch4-20260912/`; Core3 pairing was blocked by the isolated runtime. No full visual parity claim is made; images remain outside Git.

## Entries to Review bounded action (2026-09-12)

The Odoo 19 `account` source exposes “Entries to Review” from each journal
dashboard's Manage section in `account_journal_dashboard_view.xml`. It opens
`action_move_journal_line` (`account.move`) with `search_default_unposted=1`;
the source action declares `list,kanban,form,activity` and the resulting list
is the unposted journal-entry review state. Core3 adds the explicit
module-qualified route `/accounting/entries-to-review` under
Accounting → Transactions, with the dashboard action represented as a menu
entry because Core3 does not yet expose journal-dashboard object links.

The page is presentation-only and joins `api/entries-to-review.yaml` through
`page.id`. Migration `20260912050000-035-accounting-entries-to-review.yaml`
adds four fixed Draft entries dated 2026-01-12 through 2026-01-15. The source
requires Accounting read access; Core3 covers `accounting.read`, deterministic
ordering, search, fixture-empty behavior, and navigation to the existing
journal-entry detail form. Posting/editing remains on that existing detail
workflow and is not duplicated here.

Focused validation passes 2 tests and 11 assertions; the YAML audit passes
with 571 pages, 578 routes, and 985 datasources. Authenticated desktop/mobile
evidence was attempted under
`/tmp/core3-odoo-parity/accounting-batch5-20260912/`, but the isolated dev
frontend terminated before the browser pass with the exact environment error
`EMFILE: too many open files` from Vite while watching
`sdk/bun/sample/vite.config.ts`; the backend listener then became unavailable
(`curl: (7) Failed to connect to 127.0.0.1 port 3001`). No screenshot or full
visual parity claim is made for this batch, and no images are committed.
