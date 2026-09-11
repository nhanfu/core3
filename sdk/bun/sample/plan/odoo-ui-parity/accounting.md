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
