# Point of Sale UI parity

Status: in-progress

## Reference gate

- Odoo addon/version: `point_of_sale`, Odoo 19 Community.
- Official demo data: enabled in the fresh `core3_demo` database at
  `http://localhost:8069`.
- Reference credentials are maintained outside the repository.
- Visible Odoo menu families: Dashboard; Orders (Customers, Orders, Payments,
  Sessions, Preparation Printers); Reporting (Session Report, Sales Details);
  Configuration (Settings, Note Models, Point of Sales, Coins/Bills, Presets,
  Taxes, Payment Methods); Products (Products, Product Variants, Combo Choices,
  Pricelists, PoS Product Categories, Attributes, Product Tags).

## Existing Core3 surface

The existing `point_of_sale` service already provides YAML/API contracts for
cashier, orders, payments, invoices, cash movements, configuration, analysis,
customer display, discount, HR, loyalty, online payment, repair, restaurant,
self-order, sessions, and workflows. Existing routes include
`/point-of-sale/cashier`, `/point-of-sale/orders`, `/point-of-sale/payments`,
`/point-of-sale/invoices`, `/point-of-sale/cash-movements`,
`/point-of-sale/configs`, and `/point-of-sale/analysis`. The current batch adds
data-backed Customers, Products, Payment Methods, Session Report, and Sales
Details routes with convention-discovered API fragments.

The current follow-up adds a configuration detail side panel and a settings
form. Authenticated browser verification confirms `/point-of-sale/configs`,
double-click navigation to `/point-of-sale/config-detail?id=pos-config-main`,
and `/point-of-sale/configuration-coverage` render with fixture data.

The dashboard batch adds `/point-of-sale` as the direct counterpart to Odoo
`/odoo/point-of-sale`, using service-owned configuration fixtures, card/list
view switching, search, and an authenticated Open Register action. Desktop and
mobile captures are kept as local comparison evidence.

The dashboard comparison found one shared CardView action propagation defect;
ListView now forwards its action handler into CardView, and an authenticated
card click is verified to navigate to `/point-of-sale/cashier?config_id=...`.

The configuration-menu batch adds authenticated fixture-backed routes for
Preparation Printers, Note Models, Coins/Bills, and Presets. Desktop/mobile
browser smoke checks verified 3, 3, 6, and 3 rows respectively; comparison
captures remain temporary local evidence.

The configuration-form batch adds permissioned Odoo-style New forms to those
four routes. Forms are service-owned YAML mutations for printers, note models,
cash denominations, and order presets, with required-field validation and list
refresh after save. Authenticated desktop/mobile checks verified each modal,
responsive layout, bounded overflow, and successful preset creation; captures
are `/tmp/core3-pos-{desktop,mobile}-{preparation-printers,note-models,coins-bills,presets}.png`.
The corresponding Core3 list and modal captures are also retained as
`/tmp/core3-pos-{desktop,mobile}-{preparation-printers,note-models,coins-bills,presets}-{list,new}.png`.
Odoo reference captures for Note Models, Coins/Bills, and Presets use actions
421, 441, and 448 and are `/tmp/odoo-pos-{desktop,mobile}-{note-models,coins-bills,presets}.png`;
Preparation Printers is not exposed in the installed Odoo demo menu.

The POS Taxes comparison was recaptured after rebuilding the ignored global and
POS styles; authenticated desktop/mobile checks show all four tax rows with no
unexpected failures or horizontal overflow. Corrected Core3 captures are
`/tmp/core3-pos-{desktop,mobile}-taxes-recaptured.png`.

POS Taxes now includes an Odoo-style New action backed by a permissioned
service-owned server form. An authenticated mobile check created `QA Reduced
Tax` and refreshed the list from four to five rows; a desktop check confirmed
the modal layout. Both checks had no unexpected failures or horizontal
overflow. Captures are `/tmp/core3-pos-mobile-taxes-created.png` and
`/tmp/core3-pos-desktop-taxes-new.png`.

Payment Methods now uses a service-owned catalog with five Odoo-matching
fixtures, selectable rows, a New payment method form, and catalog-backed
detail navigation. Authenticated desktop/mobile checks loaded all five rows
without failures or overflow; mobile creation refreshed the list to six rows,
and Card detail displayed its journal, company, and Point of Sale fields.
Captures are under `/tmp/core3-pos-{desktop,mobile}-payment-methods-catalog.png`
and `/tmp/core3-pos-mobile-payment-method-detail-final.png`.
The catalog now projects boolean activity as the Odoo-compatible `Active` or
`Archived` label; a fresh mobile check confirmed all five rows render `Active`
with no failures or overflow.

The product-catalog batch adds the five remaining Odoo product submenu routes:
Combo Choices, Pricelists, PoS Product Categories, Attributes, and Product Tags.
Each route is a `ListView` backed by the convention-discovered
`pos-product-catalog.yaml` API fragment and migration `011`, with search and an
Active/Archived filter. Fixtures intentionally mirror the visible Odoo list
columns: combo choice/product/category/extra price, pricelist name/country
groups/company, category/parent/sequence, attribute/display type/variant
creation, and tag/color/product count.

The session parity batch adds the explicit Sessions menu and corrects session
detail navigation. The Sessions list is backed by the service-owned session
API, includes bounded status filtering and state-aware open/start-closing/
close-post controls, and opens the shared POS session form. Session detail
uses the shared OdooFormView status bar, cash-control fields, cash movements,
orders, and operation log. The lifecycle workflow now persists counted cash,
expected cash, differences, and discrepancy reason on close. Deterministic
fixtures cover Opening Control, In Progress, Closing Control, and Closed &
Posted, while the existing cashier route remains the touch-selling surface
with its active-session and open-ticket state.
## Current batch: product and customer forms

The Odoo Products and Customers surfaces were captured at 1440x900 and 390x844.
Core3 now adds row-open/double-click navigation from `/point-of-sale/products`
and `/point-of-sale/customers` to service-owned Product and Customer forms,
including related POS orders for a customer. Authenticated checks verified both
lists and both detail routes at desktop and mobile sizes with zero unexpected
responses and no horizontal overflow. Odoo captures are under
`/tmp/odoo-pos-{desktop,mobile}-{products,customers}.png`; Core3 captures are
under `/tmp/core3-pos-{desktop,mobile}-{products,product-detail,customers,customer-detail}.png`.

## Remaining parity work

The live Odoo Settings action is action 463 and was captured at both target
viewports. Core3 now exposes the canonical `/point-of-sale/settings` menu route
with SettingsView tabs for General Settings and Point of Sale, including
payment, cash-control, interface, employee-login, and restaurant controls.
Authenticated checks verified tab switching, zero unexpected responses, and no
horizontal overflow. Odoo captures are `/tmp/odoo-pos-{desktop,mobile}-settings.png`;
Core3 captures are `/tmp/core3-pos-{desktop,mobile}-settings.png`.

The live POS action audit resolved Payment Methods to action 479 and captured
its list/kanban surfaces at both target viewports. Core3 now supports row-open
and double-click navigation from `/point-of-sale/payment-methods` to a service-
owned payment-method form. Authenticated checks verified list and detail states
with no unexpected responses or horizontal overflow. Odoo captures are under
`/tmp/odoo-pos-{desktop,mobile}-payment-methods.png`; Core3 captures are under
`/tmp/core3-pos-{desktop,mobile}-payment-{methods,detail}.png`.

The cashier workflow was audited in an isolated all-memory runtime at desktop
and mobile sizes. Authenticated browser evidence covers New ticket with an open
session lookup, Add to ticket for House coffee, and Register payment using Cash.
The resulting order appears in POS Orders as Paid with total 3.85, paid 3.85,
tax 0.35, and payment method Cash. Core3 captures are kept locally under
`/tmp/core3-pos-cashier-desktop-{initial,new-ticket,product-added,paid,order-paid}.png`
and `/tmp/core3-pos-cashier-mobile.png`.
An authenticated dispatcher session without `pos.write` receives the expected
403 page-load response and the visible Failed to load page state.

The audit fixed three shared/runtime gaps found by the browser: direct Bun
component fallback registration for native form fields, lookup propagation and
refresh for list-created server forms, and two-decimal POS payment inputs.
Mobile stat cards now collapse to two columns and the list root contains table
header overflow while preserving its internal horizontal viewport. The cashier
surface remains in-progress pending additional empty/error-state coverage and a
fresh Odoo touch-session comparison.

The Odoo touch dashboard and Furniture Shop selling session were captured at
1440x900 and 390x844, including the opening-control modal and responsive product
grid. Core3 now exposes `/point-of-sale/touch` through the dashboard register
action and renders the shared `PosShell` with the active session, service-owned
products, open tickets, cart, and payment affordance. Authenticated browser
checks verified the route at both viewports with zero unexpected responses and
no horizontal overflow. Odoo captures are `/tmp/odoo-pos-{desktop,mobile}-touch-{dashboard,selling}.png`;
Core3 captures are `/tmp/core3-pos-touch-shell-final-{desktop,mobile}.png`.

Remaining work is focused on additional configuration forms, payment/tender
modals, and broader empty/error-state coverage across the already implemented
POS routes. Session open/close controls, product/customer forms, responsive
desktop/mobile composition, permission-denied behavior, and the touch-selling
dashboard/session now have implementation and captured browser evidence.

The Payments batch adds the Odoo read-only `list,form` surface to Core3. The
grouped payment list now opens `/point-of-sale/payment-detail` on row click or
double-click, and the detail form exposes the Odoo-visible session, order,
amount, currency, payment method, date, and status fields from a separate
page-id-owned datasource. Its initial Payment Method grouping is represented by
the shared `default_group_by` ListView contract, and the detail opens as a full
read-only route rather than an unsolicited side panel. Authenticated Core3 and
personal-Odoo list/detail captures are retained under `/tmp`; screenshots
remain outside the repository.

The cashier payment follow-up fixes the row-aware server-form contract: the
selected ticket and remaining balance are prefilled from the service-owned
ticket projection, active tender choices come from the POS payment-method
catalog, Cash is the default, and amount min/decimal validation is visible in
the dialog. Server guards still reject overpayment and unavailable methods.
The batch also gives the cashier product list an explicit no-results state.
Because the existing YAML server-form modal did not resolve object prefill
maps or expose field-level validation, this batch makes that narrowly scoped
shared `PageFormModal` change; no ActivityView or other shared primitive is
included. Browser evidence and remaining validation/empty gaps are recorded
with the commit handoff.

The product-catalog batch adds the five remaining Odoo product submenu routes:
Combo Choices, Pricelists, PoS Product Categories, Attributes, and Product Tags.
Each route is a `ListView` backed by the convention-discovered
`pos-product-catalog.yaml` API fragment and migration `011`, with search and an
Active/Archived filter. Fixtures mirror the visible Odoo list columns for
choices, pricelists, categories, attributes, and tags.

Authenticated Core3 checks at 1440x900 and 390x844 loaded all five catalog
routes with 4-5 deterministic rows, no unexpected failed responses, and no
horizontal overflow. Captures are under `/tmp/core3-pos-{desktop,mobile}-*`
for the five catalog routes; corresponding Odoo reference captures remain
under `/tmp/odoo-pos-*`.

The session lifecycle batch adds status filtering, closing-balance visibility,
and permissioned Open, Start Closing, and Close & Post row actions. Its guarded
workflow records counted cash, expected cash, discrepancy, and close time; the
focused integration test covers the session transition contract.

## Current batch: touch tender and payment states

The touch-selling surface now binds its active payment-method catalog and open
ticket line to service-owned datasources. A deterministic open ticket is seeded
for the active demo register so the touch flow starts with a real order rather
than a local-only cart. Product taps submit a guarded service mutation that
adds a line and recalculates the order total; payment submission uses a second
guarded mutation for positive amounts, remaining-balance limits, active tender
methods, open-ticket state, and write permission.

The payment screen is touch-first at desktop and 390px: it shows amount due,
already paid, tendered amount, change, remaining balance, large active-method
buttons, exact/$20 shortcuts, a visible validation error region, and a receipt
state after full payment. The shell also exposes explicit no-register,
no-order, no-product, no-open-ticket, and read-only permission states. Browser
captures remain local under `/tmp/core3-pos-touch-payment-*`; no screenshots are
part of the commit.

Focused client/integration tests cover product submission, tender selection,
change calculation, receipt transition, permission-boundary taps, datasource
ownership, server guards, and the deterministic fixture. Final desktop/mobile
checks are recorded with the commit handoff.
## Current batch: Preset detail form

The live Odoo Presets action is action 755 and uses `list,form` views. Its form
exposes label, service mode, pricelist, fiscal position, order timing and
capacity, identification, return mode, color, and self-order options. Core3
now opens `/point-of-sale/preset-detail?id=...` from the Presets list and binds
the form to `pos-preset-detail`/`pos_preset_detail` API YAML with matching
`page.id` values. The permissioned update action uses optimistic
`row_version` concurrency, while migration 014 adds the detail fields and
updates the three stable preset fixtures. The list has an explicit empty state;
read access requires `pos.read` and edits require `pos.manage`.

## Current batch: touch opening control

The touch register now renders an Odoo-style Opening Control modal when the
selected session is in `Opening Control`. It exposes counted opening cash,
opening note, Open Register, and Discard controls, with a service-owned guarded
mutation that rejects negative cash or a session that has already opened and
persists the note before moving the session to In Progress. Migration 019 adds
the deterministic note column. Authenticated isolated-runtime checks reached
the modal at `/point-of-sale/touch?id=pos-session-demo-opening` at 1440x900 and
390x844 with no failed requests or horizontal overflow. Odoo references are
`/tmp/odoo-pos-opening-control-{desktop,mobile}-fresh.png`; Core3 captures are
`/tmp/core3-pos-opening-control-{desktop,mobile}-fresh.png`. The underlying
isolated runtime still shows the known oversized launcher icon treatment in
the background; the modal fields, labels, spacing, and actions were compared
directly against Odoo. Existing-row editing and broader opening-control cash
denomination behavior remain deferred.

## Current batch: Product Variants list and detail parity contract

### Odoo menu and action contract (inspected 2026-09-10)

- Addon/version: `point_of_sale`, Odoo 19 Community; the fresh owned reference
  database has the official demo catalog enabled.
- Menu tree and ordering: `Point of Sale` → `Products` → `Product Variants`,
  immediately before `Combo Choices`. The visible menu opens Odoo action 689;
  its list action is `list,kanban,form`, with `New` before the search bar and
  list/kanban view controls on the right.
- Visibility: the menu and read-only list/detail require the POS product read
  access available to the authenticated reference user. `New` and edits are
  product-management actions and remain outside this bounded slice; Core3
  detail must therefore be read-only for `pos.read` users.
- List states: desktop list columns are `Internal Reference`, `Name`, `Variant
  Values`, `Sales Price`, `Cost`, `On Hand`, `Forecasted`, and `Unit`; the
  initial demo state shows `1-80 / 141`. At 390px Odoo switches to a compact
  kanban card with favorite affordance, name, internal reference, variant-value
  chips, price, and product image. Empty/search-no-result state remains an
  explicit list/kanban empty state.
- Row action: selecting the first demo row (`CONS_0001`, `Whiteboard Pen`)
  opens `/odoo/action-689/71`; the row position is shown as `1 / 80` with
  previous/next navigation and a `New` action in the form header.
- Detail layout: the header shows `Product`, favorite, product name, product
  image, and checkboxes `Sales`, `Point of Sale ?`, `Expenses ?`, `Purchase`.
  The notebook tabs are exactly `General Information`, `Sales`, `Point of
  Sale`, `Purchase`, and `Inventory`. The first tab exposes `Product Type ?`
  (`Goods`, `Service`, `Combo`), `Invoicing Policy ?`, `Track Inventory ?`,
  `Sales Price ?`, `Sales Taxes ?`, `Cost ?`, `Internal Reference`, `Barcode ?`,
  `Purchase Taxes ?`, `Category`, and `Company`, followed by `INTERNAL NOTES`.
  The right-side chatter shows `Send message`, `Log note`, and `Activity`.
- Responsive contract: at 1440x900 the form uses a two-column content card
  with chatter on the right; at 390x844 the list is card-based and the form
  remains single-column with tabs/action controls fitting the viewport without
  horizontal overflow.
- Captured references: `/tmp/odoo-pos-next-product-variants-list-desktop.png`,
  `/tmp/odoo-pos-next-product-variants-list-mobile.png`, and
  `/tmp/odoo-pos-next-product-variant-detail-desktop.png`.

### Core3 implementation and QA contract

- Add a row-open/double-click action from `pos-product-variants` to a separate
  `pos-product-variant-detail` page. Keep page YAML and API YAML separate and
  join them through the exact matching `page.id`.
- Use deterministic service-owned variant fixtures and a detail datasource
  keyed by `:id`; do not add page-local records or an unrelated generic product
  detail shortcut. The detail is read-only under `pos.read`; no edit mutation is
  part of this slice.
- Reuse `ListView`, `OdooFormView`, `StatusBar`/header primitives, and the
  existing responsive form/chatter composition. Focused tests must cover page
  and API IDs, list navigation, detail projection, unknown-ID behavior, and the
  permission boundary. Authenticated headless checks must capture list and
  detail at 1440x900 and 390x844, verify no unexpected responses or horizontal
  overflow, and compare the visible labels, tabs, toolbar, empty state, and
  responsive cards against the Odoo references.

### Product Variants parity handoff (2026-09-10)

Core3 now implements the bounded list-to-detail slice. The list exposes the
Odoo column contract, responsive mobile cards, explicit no-result messaging,
and row click/double-click navigation to
`/point-of-sale/product-variant-detail?id=...`. The detail is a read-only
`OdooFormView` with the five Odoo notebook tabs, product fields, four stat
cards, and service-owned chatter actions. The list and detail page/API YAML
fragments use matching `page.id` values; migration `020` supplies the
deterministic detail projection and message fixture.

Focused integration coverage passes with 4 tests and 26 assertions. The
authenticated isolated-runtime audit passes at 1440x900 and 390x844: the
list, detail, filtered empty state, and `pos.read` denial state were checked
without unexpected responses or horizontal overflow. Core3 evidence is under
`/tmp/core3-pos-next-product-variants-{list,detail}-{desktop-final,mobile-final}.png`,
with empty-state captures under
`/tmp/core3-pos-next-product-variants-empty-{desktop-final,mobile-final}.png`
and the denied-state capture at
`/tmp/core3-pos-next-product-variants-permission-denied.png`. Odoo references
are the three captures listed above.

The slice intentionally does not implement Odoo's `New`/edit flow, product
image, header checkboxes, purple Odoo shell styling, or the full 141-row demo
catalog; Core3 uses four deterministic service-owned variants. Chatter writes
are guarded by `pos.write`, while the displayed detail remains read-only for
this batch.

The Coins/Bills batch now uses the shared inline-list contract for Odoo action
698. It provides thirteen deterministic denomination fixtures at
`/point-of-sale/coins-bills`, responsive search and list rendering, and
permissioned New/Save/Discard editing with required-field and row-version
guards. Authenticated desktop/mobile CRUD evidence is retained under `/tmp`;
screenshots remain outside Git.

## Current batch: Orders Analysis report

The owned Odoo 19 reference exposes `Point of Sale → Reporting → Orders` as
the Orders Analysis action. Its authenticated report defaults to the `Not
Cancelled` domain and provides Graph and Pivot views at desktop and mobile
widths. The graph groups by product category and measures `Total Price`; the
pivot groups by product category and status with `Orders` and `Total Price`
measures. Reference captures are `/tmp/odoo-pos-orders-analysis-desktop.png`
and `/tmp/odoo-pos-orders-analysis-mobile.png`.

Core3 adds `/point-of-sale/orders-analysis` with a separate page/API pair
joined by `page.id`, the reporting menu entry, deterministic paid/cancelled
analysis rows, service-owned cancelled exclusion, Graph/Pivot/List tabs,
empty/search states, and `pos.read` permission. The pivot explicitly
suppresses duplicate leaf rows for grouped aggregate results. Core3 captures
are `/tmp/core3-pos-orders-analysis-desktop.png`,
`/tmp/core3-pos-orders-analysis-mobile.png`, and
`/tmp/core3-pos-orders-analysis-pivot.png`; screenshots remain outside Git.
The bounded slice does not yet reproduce Odoo's purple shell or visible
`Not Cancelled` search facet; those remain documented visual follow-up gaps.

## Current batch: Sales Details wizard action 703

The owned Odoo 19 reference exposes `Point of Sale → Reporting → Sales Details`
as action 703 (`pos.details.wizard`, form view). At 1440x900 it opens a modal
with Start Date, End Date, a three-row Point of Sale line table, Add a line,
Print, and Cancel; at 390x844 the same table becomes a clipped responsive row
layout and the footer actions remain touch-sized. Reference captures are
`/tmp/odoo-pos-next-sales-details-wizard-{desktop,mobile}.png`; both had zero
failed responses and viewport/body widths of 1440/1440 and 390/390.

Core3 adds the disjoint `/point-of-sale/sales-details-wizard` route rather than
changing the existing `/point-of-sale/sales-details` list. Its page/API
fragments join through `pos-sales-details-wizard`, with fixed January 2026
wizard and line fixtures, read/manager permissions, date-range and balance
guards, line create/update/delete actions, explicit empty and transport-error
datasource states, and a client Print action. The route is deliberately
full-page because the YAML page runtime has no page-level modal contract; its
form sheet and x2many line grid preserve the Odoo fields, labels, actions, and
responsive structure.

## Shared primitives and fixtures

Use the existing POS cashier, `ListView`, `OdooFormView`, `StatRow`, `Chart`,
`StatusBar`, modal, and responsive primitives. Every new page must bind to a
service-owned datasource/API fixture; no page-local hard-coded records or
images are permitted.

## Current batch: All sales lines action 684

The owned Odoo 19 reference exposes the installed `point_of_sale` action 684,
“All sales lines” (`pos.order.line`, `list,form`). Its authenticated list shows
Order Ref, Created on, Product, Quantity, and Unit Price with eight seeded demo
lines; opening a row shows Product, Quantity, Discount (%), Unit Price, Created
on, and Currency. Core3 adds the disjoint `/point-of-sale/sales-lines` route and
`/point-of-sale/sales-line-detail` form. The page/API fragments are joined by
matching `page.id` values and use deterministic January 15, 2026 line fixtures.

The service-owned contract includes `pos.read` list/detail access, `pos.manage`
create/update/delete mutations, optimistic row-version guards, bounded search,
missing/stale/invalid-record errors, and an explicit empty state. The route is
listed as All Sales Lines under Point of Sale Reporting. Authenticated desktop
and mobile Core3/Odoo captures and focused test/audit evidence are retained
outside Git; screenshots are never committed.

## Acceptance

- Every listed Odoo menu has an explicit Core3 route or a documented deliberate
  redirect.
- Product-catalog list routes render deterministic fixture rows, support bounded
  search/filter interactions, and remain service-owned without page-local
  records.
- Authenticated desktop/mobile checks cover lists, forms, touch selling,
  payment/session modals, settings, empty/error/permission states.
- `bun run audit` passes with no POS route silently resolving elsewhere.
- Commits contain YAML/TS/docs only; screenshots remain local evidence and are
  never committed.

## Current batch: cashier initial, empty, error, and denied states

The existing `/point-of-sale/cashier` and `/point-of-sale/touch` surfaces now
carry explicit service-owned `initial`, `empty`, `not_found`, and
`transport_error` fixture behavior through their page-id-matched API fragments.
The touch shell labels its initial register, catalog/ticket/cart/payment empty,
datasource error with retry, and permission-denied states in the existing
surface. Page-prefetched datasource errors retain their status/code/message so
the shell can render an actionable error card instead of treating a failed
source as an ordinary empty list. No catalog route was added.

## Current batch: PoS Product Category detail

The owned Odoo `point_of_sale` addon exposes `PoS Product Categories` as a
`list,kanban,form` action. Its form is POS-specific: the category name and
parent are the primary fields, color is a POS display setting, and the list
sequence controls touchscreen ordering. Core3 now opens
`/point-of-sale/product-category-detail?id=...` from the existing category
list and provides a matching new-category route. The page and API YAML
fragments use matching `page.id` values and service-owned deterministic
fixtures.

The detail form includes a Products stat navigation, active/archive state,
required-name and duplicate guards, self-parent validation, optimistic
row-version updates, and deletion guards for categories with products or
children. Create, update, and delete require `pos.manage`; list, detail, and
product navigation require `pos.read`. Empty, missing, and transport-error
contracts remain explicit at the datasource boundary. Authenticated Core3 and
owned-Odoo desktop/mobile captures are retained under `/tmp`; screenshots are
not committed.

## Current batch: Preparation Printers detail and connection workflow

The existing Preparation Printers list was only create-capable. Core3 now adds
the Odoo-style row-open route `/point-of-sale/preparation-printer-detail` with
a separate page/API pair joined by `pos-preparation-printer-detail`. The
service-owned detail exposes printer/device/proxy/category/connection fields,
active state, explicit empty/missing/transport-error datasource behavior, and
permissioned edit/delete actions.

Migration `026` adds optimistic `row_version` support and normalizes the three
stable printer fixtures to fixed January 15, 2026 `last_seen` values. Create
and update validate required fields and case-insensitive duplicate names;
update/delete require `pos.manage` and a current row version. The declared
`pos_preparation_printers` workflow covers Connected, Paused, and Disconnected
states with guarded Connect, Pause, and Disconnect transitions, including
stale-record and invalid-transition errors.

Focused integration coverage passes with 4 tests and 34 assertions for menu
registration, matching page/API IDs, fixture/search/empty/error states, CRUD,
permissions, validation, stale guards, and workflow transitions. Browser
verification was not run in this bounded handoff because the required
persistent browser tooling was unavailable; no screenshots are part of the
commit.

## Current batch: Product Variant New action

The owned Odoo 19 database currently exposes Product Variants as action 531
(`list,kanban,form`) under Point of Sale → Products. Its authenticated New
state uses `/odoo/action-531/new`, with Product, Sales, Expenses?, Point of
Sale?, Purchase, the five notebook tabs, stat buttons, and the Odoo responsive
list/form composition. Core3 now exposes the matching `New` action at
`/point-of-sale/product-variants/new`, joined through the separate
`pos-product-variant-new` page/API IDs. The service-owned form supports
deterministic defaults, create permission, required-name, non-negative price
and cost, and duplicate variant-value guards; migration `0.0.28` persists
`row_version` for the new fixture contract.

Focused integration coverage passes 5 tests and 40 assertions for page/API
joins, Odoo labels/tabs, defaults, create, empty/error datasource metadata,
validation, duplicate, and permission contracts. Odoo list/New captures are
under `/tmp/odoo-pos-product-variants-new-slice-list-{desktop,mobile}.png` and
`/tmp/odoo-pos-product-variant-new-slice-{desktop,mobile}.png`. Core3 initial
list/New captures are `/tmp/core3-pos-product-variants-new-slice-list-1440.png`,
`/tmp/core3-pos-product-variant-new-1440.png`,
`/tmp/core3-pos-product-variants-new-slice-list-390.png`, and
`/tmp/core3-pos-product-variant-new-390.png`; the denied-state capture is
`/tmp/core3-pos-product-variant-new-permission-denied.png`.

The final browser pass was interrupted after a backend crash caused by the
initial string/numeric guard expression; that expression is fixed and the
focused suite passes, but the post-fix successful browser create-and-refresh
transition was not recaptured in this handoff. Screenshots remain outside Git.

## Current batch: Floor Plans

The healthy authenticated Odoo 19 personal reference exposes Configuration →
Floor Plans as action 761 with list, kanban, and form views. At 1440x900 the
list shows Floor Name and Point of Sales for five demo floors; the New and
detail forms expose Floor Name, Point of Sales, and the Tables line grid with
Table Number, Seats, Shape, and Add a line. At 390x844 Odoo switches the list
to cards and keeps the form/grid controls touch-sized. Reference captures are
`/tmp/odoo-pos-floor-plans-desktop-list.png`,
`/tmp/odoo-pos-floor-plans-desktop-new.png`,
`/tmp/odoo-pos-floor-plans-desktop-detail.png`,
`/tmp/odoo-pos-floor-plans-mobile-list.png`,
`/tmp/odoo-pos-floor-plans-mobile-new.png`, and
`/tmp/odoo-pos-floor-plans-mobile-detail.png`; the authenticated pass had no
failed requests or missing-addon errors after the personal database update.

Core3 adds the bounded Floor Plans slice at
`/point-of-sale/floor-plans`, `/point-of-sale/floor-plans/new`, and
`/point-of-sale/floor-plan-detail`. Page YAML and API YAML remain separate and
join through `pos-floor-plans`, `pos-floor-plan-new`, and
`pos-floor-plan-detail` IDs. Migration `029` owns five deterministic floor
fixtures and three table fixtures in the Point of Sale service. The list has
search, list/kanban views, an empty state, and transport-error metadata; forms
provide required/duplicate validation, optimistic row-version guards,
in-use-delete protection, and permissioned floor/table CRUD. New-floor table
editing is intentionally deferred until the parent floor is saved, matching
the Odoo workflow guard.

Focused integration coverage passes 3 tests and 39 assertions. `bun run audit`,
the Point of Sale CSS build, and `git diff --check` also pass. Authenticated
Core3 route checks at 1440x900 and 390x844 completed for list, New, and detail
with no failed requests and no horizontal overflow; the six Core3 PNGs are
provisional only because this isolated runtime captured the transient
launcher/loading glyph instead of the rendered page. Therefore there is no
Core3 visual sign-off for this batch. The Odoo PNGs are valid paired reference
evidence. All captures remain in `/tmp` and are not committed.

## Current batch: Point of Sale configuration action 747

The authenticated personal Odoo 19 reference exposes Configuration → Point of
Sale as action 747 (`pos.config`, list and form). At 1440x900 the list has six
demo configurations—Furniture Shop, Clothes Shop, Bakery Shop, Restaurant, Bar,
and Kiosk—with Point of Sale, Company, Closing, Balance, and Status columns.
The detail/New form exposes Point of Sale and the configuration checklist fields
Log in with Employees?, ePOS Printer?, and IoT Box. At 390x844 the authenticated
Odoo action remains usable without horizontal overflow. Reference captures are
`/tmp/odoo-pos-config-desktop-list-final.png`,
`/tmp/odoo-pos-config-desktop-detail-final.png`,
`/tmp/odoo-pos-config-desktop-new-final.png`,
`/tmp/odoo-pos-config-mobile-list-final.png`,
`/tmp/odoo-pos-config-mobile-detail-final.png`, and
`/tmp/odoo-pos-config-mobile-new-final.png`.

Core3 now exposes the bounded action at `/point-of-sale/configs` and
`/point-of-sale/config-detail`, with New opened from the list. Page YAML and
service API YAML remain separate and join through `pos-configs` and
`pos-config-detail` page IDs. Migration `030` owns the six deterministic
configuration fixtures, checklist flags, closing/balance fields, and optimistic
`row_version` support. The list provides Odoo-shaped columns, responsive cards,
search, explicit empty state, and transport/forbidden error metadata. Detail
and New provide required-name, duplicate, stale-write, active-session, and
in-use-delete guards; create/update/delete actions require `pos.manage`, while
read routes require `pos.read`.

Focused integration coverage passes 3 tests and 30 assertions for menu/action
registration, page/API joins, fixture/search/empty/detail-not-found states,
transport and forbidden errors, permissioned CRUD, validation, active-session
and in-use guards, and optimistic concurrency. Authenticated Core3 browser
evidence passes at 1440x900 and 390x844 for list, detail, and New with no failed
requests or horizontal overflow. Captures are
`/tmp/core3-pos-config-desktop-list-final.png`,
`/tmp/core3-pos-config-desktop-detail-final.png`,
`/tmp/core3-pos-config-desktop-new-final.png`,
`/tmp/core3-pos-config-mobile-list-final.png`,
`/tmp/core3-pos-config-mobile-detail-final.png`, and
`/tmp/core3-pos-config-mobile-new-final.png`. Successful authenticated create
evidence is `/tmp/core3-pos-config-desktop-created-final.png`; guarded edit
evidence is `/tmp/core3-pos-config-desktop-edit-guard-final.png` and
`/tmp/core3-pos-config-mobile-edit-guard-final.png`. All captures remain in
`/tmp` and are not committed.

Known visual limits are the shared Core3 shell/breadcrumbs, Core3’s Edit action
and modal New presentation, plain numeric Balance instead of Odoo currency
formatting, boolean read-only values rendered as text instead of disabled
checkbox glyphs, and Core3 mobile cards versus the captured Odoo mobile list.
