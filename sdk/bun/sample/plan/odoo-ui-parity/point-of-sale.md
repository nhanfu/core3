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

Core3 adds the disjoint `/point-of-sale/sales-details` wizard route while the
existing all-sales-lines list remains `/point-of-sale/sales-details-lines`.
Its page/API fragments join through `pos-sales-details-wizard`, with fixed
January 2026 wizard fixtures, date-range guards, and an x2many selection bound
to existing active `pos_configs`. Company, Closing, and Balance are
read-only metadata columns from the selected configuration; Add a line and
Delete remove or add selections, matching Odoo's `pos_config_ids` many2many
field rather than inventing editable configuration records. The route is
deliberately full-page because the YAML page runtime has no page-level modal
contract; its form sheet and responsive line grid preserve the Odoo fields,
labels, actions, and permissions.

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

## Current bounded batch: POS Taxes browser sign-off and active default

The fresh `core3_codex_demo` Odoo 19 source audit on 2026-09-11 found 23
visible Point of Sale leaf actions under Dashboard, Orders, Products,
Reporting, and Configuration. Every leaf has a Core3 menu counterpart; no new
absent action was invented. The materially incomplete action selected for this
batch was Taxes: its page/API contracts, deterministic fixtures, guarded
manager mutations, and static tests existed, but authenticated Core3 browser
evidence was deferred. Odoo action 368 (`account.action_tax_form`) opens with
inactive taxes hidden (`1-4 / 4`) while retaining the active/inactive filter.

The bounded fix adds `default_filters: { active: 'true' }` to the existing
`pos-taxes` ListView. Archived fixtures remain available through the Status
filter. Page YAML/API YAML separation, matching `page.id` values, service-owned
migrations, `pos.read` read access, `pos.manage` create/update/archive/restore/
duplicate/delete access, optimistic row-version guards, and distribution-line
guards remain in the existing POS Taxes contracts.

Implementation checkpoint: `fdc22265` (`fix(pos): default taxes list to active
records`). Focused validation passes 7 tests and 76 assertions across the tax
list/detail and distribution-line suites. The full static gates for this
handoff pass: `bun run audit` (498 pages, 505 routes, 879 datasources), ESLint,
global CSS build, POS CSS build, and `git diff --check`.

Authenticated browser verification used `admin@tms.local` / `admin123` in an
isolated Core3 runtime and `codex@core3.local` / `Core3Odoo2026!` in the fresh
Odoo database. List, existing-tax detail, and New states were captured and
visually inspected at both requested viewports. All twelve captures reported
zero `requestfailed` entries, zero `pageerror` entries, and exact body/document
widths matching the viewport.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Taxes list | 1440×900 | `/tmp/odoo-codex-pos-taxes-list-desktop-final-20260911.png` | `b6e43e64131388edf3686b8c9755e012933e98b10e6a6b7f5ea8aceca08c6beb` |
| Odoo Taxes detail | 1440×900 | `/tmp/odoo-codex-pos-taxes-detail-desktop-final-20260911.png` | `b9dd7a7931cc24b4a7dd9963467285e03f19060c11231c8cf88663cc6eabef19` |
| Odoo New Tax | 1440×900 | `/tmp/odoo-codex-pos-taxes-new-desktop-final-20260911.png` | `8c1d2ec0f24fb47b396e300b362fab8bf271884b696fc6dc5f9ed40e3eb5377b` |
| Core3 Taxes list | 1440×900 | `/tmp/core3-pos-taxes-list-desktop-final-20260911.png` | `35683d6852f9fbdb8582c01854812b2c0468af80a2dbba6f0fd0ee239ffd2d25` |
| Core3 Tax detail | 1440×900 | `/tmp/core3-pos-taxes-detail-desktop-final-20260911.png` | `72e15e32dfe2134015981139a233b22e8e16ce3cef3cd4371da89179869bf204` |
| Core3 New Tax | 1440×900 | `/tmp/core3-pos-taxes-new-desktop-final-20260911.png` | `584a4e72cd4455264171ba43039c03c7e0886dcf91e6d41b0df3fa9f0f28d422` |
| Odoo Taxes list | 390×844 | `/tmp/odoo-codex-pos-taxes-list-mobile-final-20260911.png` | `60b960767c396b0cf6233358dab38a3459b884cae853255b428d156711a4aa58` |
| Odoo Taxes detail | 390×844 | `/tmp/odoo-codex-pos-taxes-detail-mobile-final-20260911.png` | `7bd52fb8ee53abbfe3dc50a0a93e1adf64b973b424d560b9b8ba880594bc9e41` |
| Odoo New Tax | 390×844 | `/tmp/odoo-codex-pos-taxes-new-mobile-final-20260911.png` | `dc5837e01a92c4593401ee034f7308403e618e2fda64f1ca83a11e50e3a5350f` |
| Core3 Taxes list | 390×844 | `/tmp/core3-pos-taxes-list-mobile-final-20260911.png` | `88a3ab19ae69602d06a1f18d147c8200e3e5bea4cbdac99bfe46422ed9df2ac7` |
| Core3 Tax detail | 390×844 | `/tmp/core3-pos-taxes-detail-mobile-final-20260911.png` | `b3d645181e707c1ac24f6b7fe0dd2b0460e6e06d05bb39a47f21fa338e909f66` |
| Core3 New Tax | 390×844 | `/tmp/core3-pos-taxes-new-mobile-final-20260911.png` | `7f8a042477847aff5b4d1a924daa194871cb6ba7673a9c5bd4d28c7524c123a2` |

The bounded comparison intentionally leaves the shared Core3 Fluent shell,
plain numeric tax formatting, and compact Core3 mobile table/form composition
as product-wide visual differences from Odoo's purple shell. Tax chatter and
the full Odoo many2one/tag picker behavior are outside this action slice.
Screenshots remain outside Git.

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

## Current bounded batch: Note Models action 743

The live Odoo 19 audit on 2026-09-12 resolves Configuration → Note Models to
menu record 429 and window action 743 (`pos.note`, list-only). Its editable
bottom list exposes the sequence handle, Name, and Color columns. Core3 now
matches that action with an inline-edit list, page/API fragments joined by
`pos-note-models`, deterministic sequence/color/version migration fields, and
permissioned create/update guards. Empty, transport-error, unauthorized, and
forbidden datasource metadata plus invalid-name, duplicate, missing, and stale
write contracts are covered by the focused test.

Paired 1440×900 and 390×844 captures were attempted under
`/tmp/core3-odoo-parity/pos-batch5-20260912/`, but browser validation stopped at
the first runtime failure: Vite exited with `EMFILE: too many open files` while
watching `vite.config.ts`, before Core3 reached `/api/modules`. No screenshots
were created or added to Git.

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

## Current batch: Attributes action 234

The authenticated personal Odoo 19 reference exposes Point of Sale →
Configuration → Products → Attributes as action 234 (`product.attribute`) with
`list,form` modes. The live list contains 13 demo attributes and exactly these
columns: Attribute, Display Type, and Variant Creation. The Size form exposes
Attribute Name, Display Type? (Radio, Pills, Select, Color, Multi-checkbox,
Image), Variant Creation? (Instantly, Dynamically, Never), and an Attribute
Values x2many grid with Value, Free text, Default Extra Price, and Add a line.
The reference was checked at 1440x900 and 390x844; it had no HTTP error
responses, console errors, or horizontal overflow. The mobile list navigation
cancels one background `/mail/data` poll while changing views; the action
itself remains rendered and healthy.

Core3 now completes the bounded action at `/point-of-sale/attributes`,
`/point-of-sale/attribute-detail?id=pos-attr-size`, and
`/point-of-sale/attributes/new`. Page YAML and service API YAML are separate
and join through `pos-attributes`, `pos-attribute-detail`, and
`pos-attribute-new` page IDs. Migration `031` adds a sequence-ordered set of
13 deterministic Odoo-shaped attributes plus 96 deterministic attribute values,
row versions, and count projections. The list supports the Odoo columns,
responsive cards, search, empty state, and transport-error metadata. Detail and
New support the exact radio choices, permissioned attribute/value CRUD,
required/duplicate/invalid-value validation, in-use delete protection, missing
record handling, and parent/line optimistic stale guards. New attribute values
are added after the parent attribute is saved, matching the bounded x2many
workflow used by the existing POS Floor Plans slice.

Focused coverage passes 4 tests and 58 assertions, including action/menu
registration, `page.id` joins, deterministic default/search/empty/error/missing
states, permissions, CRUD, validation, duplicate/in-use guards, and stale
parent/line mutations. Authenticated browser evidence passes at both requested
viewports with zero Core3 failed requests, zero console errors, and no
horizontal overflow. The paired captures are:

- Odoo: `/tmp/odoo-pos-attributes-list-desktop-20260911-final.png`,
  `/tmp/odoo-pos-attributes-detail-desktop-20260911-final.png`,
  `/tmp/odoo-pos-attributes-new-desktop-20260911-final.png`,
  `/tmp/odoo-pos-attributes-list-mobile-20260911-final.png`,
  `/tmp/odoo-pos-attributes-detail-mobile-20260911-final.png`, and
  `/tmp/odoo-pos-attributes-new-mobile-20260911-final.png`.
- Core3: `/tmp/core3-pos-attributes-list-desktop-20260911-final.png`,
  `/tmp/core3-pos-attributes-detail-desktop-20260911-final.png`,
  `/tmp/core3-pos-attributes-new-desktop-20260911-final.png`,
  `/tmp/core3-pos-attributes-list-mobile-20260911-final.png`,
  `/tmp/core3-pos-attributes-detail-mobile-20260911-final.png`, and
  `/tmp/core3-pos-attributes-new-mobile-20260911-final.png`.

Known visual limits are Core3’s shared shell and breadcrumb/header composition,
the Core3 inline radio layout versus Odoo’s compact form sheet, the current
line grid’s em dash/empty Free text rendering and plain numeric extra-price
formatting, and the intentionally deferred add-line interaction on an unsaved
New parent. Screenshots remain under `/tmp` and are not committed.

## Current batch: Session Report action 723

The authenticated personal Odoo 19 reference exposes Reporting → Session
Report as action 723 (`pos.session`). It is a wizard rather than a report
list: the form title is `Session Report`, the selector is `Pos Session`, the
`Add a report per each employee` checkbox is enabled by default, and the
available controls are `Print` and `Cancel`. The action was checked against
`core3_personal` at 1440×900 and 390×844 with no failed responses or horizontal
overflow.

Core3 now implements the bounded wizard at `/point-of-sale/session-report`.
The page/API fragments join through `pos-session-report`; migration `032`
owns the deterministic `pos_session_report_wizards` record and the session
lookup is projected from service-owned `pos_sessions`. Both datasources and
both actions require `pos.read`, with explicit empty, missing, and transport
error coverage. There is no independent CRUD surface for this Odoo wizard;
the focused test verifies the permission boundary and safe read-only controls.

Implementation checkpoint: `b3ede7e2` (`feat(pos): add session report wizard parity`).
Focused validation passes 4 tests and 20 assertions; the UI audit passes with
452 pages, 459 routes, and 788 datasources; `git diff --check` is clean.

Authenticated evidence captured and visually inspected on 2026-09-11:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo action 723 | 1440×900 | `/tmp/odoo-pos-session-report-desktop-1440x900-20260911.png` | `17f6186e048b0be179dfc7a7ece04da148fb0774e3eed6951f564e3efeb38138` |
| Odoo action 723 | 390×844 | `/tmp/odoo-pos-session-report-mobile-390x844-20260911.png` | `7ec26d1295982d907feccdb7e20bf9b8509884885535af7e269a754c2748004c` |
| Core3 Session Report | 1440×900 | `/tmp/core3-pos-session-report-desktop-1440x900-20260911-final.png` | `ec3ca8bc56f9fa46ca53fa98ccea2c891b95cf9e65da76c0dc52fd1045717db9` |
| Core3 Session Report | 390×844 | `/tmp/core3-pos-session-report-mobile-390x844-20260911-final.png` | `645ab008643a5707f5cc301c21b73e166cd20ca6fafa716ebd431530c1c32072` |

The Core3 route was reached through the authenticated app launcher and POS
menu before capture. The route rendered with zero unexpected responses, zero
console errors, and `document.documentElement.scrollWidth` equal to the
viewport at both sizes. The deliberate visual gap is that Odoo presents a
purple-shell modal over the dashboard, while Core3 uses its shared Fluent
shell and an in-page OdooFormView card; Core3 also currently renders the
header actions alongside the form edit footer, so Print and Cancel appear in
both locations. Screenshots remain outside Git.

## Current batch: standalone Sale line action 731

The authenticated personal Odoo 19 database exposes the installed standalone
`Sale line` action 731 (`pos.order.line`, list view). It is distinct from the
covered `All sales lines` action 734: the list columns are Product, Quantity,
Discount (%), Unit Price, Tax Excl., Tax Incl., and Created on, with a New
action and 21 committed demo rows. The action was checked at 1440×900 and
390×844; the mobile pager is hidden by Odoo at the narrow breakpoint.

Core3 adds the separate `/point-of-sale/sale-line` route with the matching
`pos-sale-line` page/API pair. The service-owned query excludes open tickets
and projects only Paid or Invoiced order lines, so the deterministic action
fixture renders the same 21-row committed-line shape without leaking the
touch-selling `House coffee` draft. New and Delete require `pos.manage`; list
and row navigation require `pos.read`. Required-value, invalid-order,
empty-state, transport-error, and permission contracts are covered by the
focused integration test. Supplied create IDs are preserved, with UUID
generation used only when the caller omits an ID.

Implementation checkpoint: `4fbeb88` (`feat(pos): add sale line action parity`).
Focused validation passes 3 tests and 19 assertions; the UI audit passes with
456 pages, 463 routes, and 795 datasources; `git diff --check` is clean.

Authenticated browser evidence was captured and visually inspected on
2026-09-11. Both surfaces returned zero unexpected responses and zero console
errors; `document.documentElement.scrollWidth` matched the viewport at both
sizes. Screenshots remain outside Git.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo action 731 | 1440×900 | `/tmp/odoo-pos-sale-line-action731-1440-final.png` | `bc421f4126e440879c7657c0cf6ac19569926cc471d493e2887ac8e0199c8dbe` |
| Core3 Sale line | 1440×900 | `/tmp/core3-pos-sale-line-action731-1440-final.png` | `bfd8420851cfa5c77401619bf11a7b1d5769e6ec147ea446d2e759898bfc3861` |
| Odoo action 731 | 390×844 | `/tmp/odoo-pos-sale-line-action731-390-final.png` | `d85976a0967e6b4ef95db37d1d548361d4337fbb04bd4bed24f164a31f40074d` |
| Core3 Sale line | 390×844 | `/tmp/core3-pos-sale-line-action731-390-final.png` | `2b0fc1c67dd910074d914c64edf895c10d3217a6df4fbd53bd15fdb99f484297` |

The remaining visual difference is the shared Core3 Fluent shell and compact
mobile table clipping versus Odoo's purple shell and formatted currency cells;
the action columns, row count, search/New controls, responsive composition,
and viewport fit are otherwise aligned for this bounded slice.

## Current batch: Combo Choice detail, options, and New form

The authenticated personal Odoo 19 reference exposes Point of Sale → Product
Catalog → Combo Choices at `/odoo/combo-choices`. The bounded action includes
the eight-row list (`Name`, `Combo Price`, `Product Count`), the
`Desk Accessories Combo` form (`Combo Choice`, `Maximum items?`, `Includes
items?`, `Combo Price?`, `Company`), its Options x2many grid (`Options`,
`Original Price`, `Extra Price`), and the New form with an empty Options grid.
The live reference was checked against `core3_personal` on 2026-09-11 at
1440×900 and 390×844.

Core3 now completes the action at `/point-of-sale/combo-choices`,
`/point-of-sale/combo-choice-detail?id=pos-combo-oat-milk`, and
`/point-of-sale/combo-choices/new`. Frontend page YAML remains separate from
backend API/action YAML and joins through `pos-combo-choices`,
`pos-combo-choice-detail`, and `pos-combo-choice-new` page IDs. Migration `034`
owns the deterministic eight-choice catalog, detail projections, and option
rows. The service contract covers `pos.read` list/detail access,
`pos.manage` parent and option CRUD, required/duplicate/value validation,
in-use deletion protection, missing/empty/transport states, and optimistic
parent/line stale guards. The New Options `Add a line` control is visible but
disabled until the unsaved parent is saved, matching the bounded x2many
workflow used by the existing POS detail slices.

Implementation checkpoints are `c094def7` (`feat(pos): add combo choice detail
parity`) and `78a9227d` (`fix(pos): keep combo choice columns responsive`). The
focused integration suite passes 4 tests and 43 assertions. ESLint passes with
no warnings; the UI audit passes with 465 pages, 472 routes, and 809
datasources; `git diff --check` is clean.

Authenticated browser evidence was captured and visually inspected on
2026-09-11. Odoo used the personal `http://localhost:8069` reference and Core3
used the isolated branch runtime from this worktree (`http://localhost:3014`,
backend `3121`) so the screenshots exercise the committed branch without
modifying the parent checkout. Both viewports reached the list through the
authenticated app, opened `Desk Accessories Combo` by row action, and loaded
the New form. The browser run recorded zero unexpected responses, zero console
errors, no horizontal overflow, all three list columns at mobile width, and
all three option-grid columns at mobile width.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Combo Choices list | 1440×900 | `/tmp/odoo-pos-combo-choices-list-desktop-20260911.png` | `6f3e22dc6be236ed9ac69bfc2cac2f90327b21fc3b9bd64f4541124159223cc2` |
| Odoo Combo Choice detail | 1440×900 | `/tmp/odoo-pos-combo-choices-detail-desktop-20260911.png` | `f0444a50ae4bfbfee7c0df3da8375bf0e85c4a4f77903c62035993ccb9f68d5b` |
| Odoo Combo Choice New | 1440×900 | `/tmp/odoo-pos-combo-choices-new-desktop-20260911.png` | `f5921177c125115e5abcff36f43cab49a928a6028866c90e62929a16d1e596d6` |
| Core3 Combo Choices list | 1440×900 | `/tmp/core3-pos-combo-choices-list-desktop-20260911-fixed.png` | `842e725fcc8e72821e32120e922dcc387c27939d864a63fa6693556f6d6f0bc7` |
| Core3 Combo Choice detail | 1440×900 | `/tmp/core3-pos-combo-choices-detail-desktop-20260911-fixed.png` | `39a9f4e04112bff5f7a80688759362c6787d24c5a43cea0bdae5ac9ff99be417` |
| Core3 Combo Choice New | 1440×900 | `/tmp/core3-pos-combo-choices-new-desktop-20260911-fixed.png` | `e3c6156c2e66235a37f67f51d91033b2af401dbf62cf2a1faa02d18a5af3c82f` |
| Odoo Combo Choices list | 390×844 | `/tmp/odoo-pos-combo-choices-list-mobile-20260911.png` | `c980cacc0c34f98175dc48673f08698cfe0ab1fe9b310759fdceb5f5fa9882b4` |
| Odoo Combo Choice detail | 390×844 | `/tmp/odoo-pos-combo-choices-detail-mobile-20260911.png` | `033ca95bb670fbee8bc4efde70c285f1943f841c15cc4b4792833d258821f3b6` |
| Odoo Combo Choice New | 390×844 | `/tmp/odoo-pos-combo-choices-new-mobile-20260911.png` | `c2baa86798ad7e06fa4e617ec71b347c6182b75b581270037ceeb379b63b5494` |
| Core3 Combo Choices list | 390×844 | `/tmp/core3-pos-combo-choices-list-mobile-20260911-fixed.png` | `bea6dead81f3caf24473681ab904c54640034aa214c631ed2350478918e3c20b` |
| Core3 Combo Choice detail | 390×844 | `/tmp/core3-pos-combo-choices-detail-mobile-20260911-fixed.png` | `d66fc7ad5aeda726a6770de03c7fc7f250d1688388c6909d33ac61de8689ab82` |
| Core3 Combo Choice New | 390×844 | `/tmp/core3-pos-combo-choices-new-mobile-20260911-fixed.png` | `45ded701ba2edcb60491bc13335e4d2cf37f1d766387927fa500672802761e75` |

The remaining visual differences are intentional shared-product gaps: Odoo
uses its purple shell and flat form sheet, while Core3 uses the Fluent shell,
breadcrumbs, and OdooFormView card; Core3 shows plain numeric currency values
where Odoo formats currency with a symbol and fixed decimals; and Core3's
mobile detail form continues below the viewport while Odoo's compact form fits
more rows. The responsive fix keeps the Odoo list's three columns visible at
390px and keeps the Options price columns visible in Core3. All screenshots
remain under `/tmp` and are not committed.

## Current bounded batch: POS Taxes list, detail, and form

The local Odoo 19 source confirms `point_of_sale` adds Configuration → Taxes as
menu record 479, using the shared `account.action_tax_form` window action 368.
The action exposes `list,kanban,form` and includes inactive records. The list
shows Tax Name, Description, Tax Type, Tax Scope, Label on Invoices, Company,
and Active. The form exposes Tax Name, Tax Computation?, Active?, Tax Type?,
Tax Scope, Amount, Fiscal Position, Replaces?, Definition, and Advanced
Options, with invoice/refund distribution grids and chatter. The Odoo source
also makes configuration mutations manager-only; POS users retain read access.

Core3 keeps the existing `/point-of-sale/taxes` menu and adds the separate
`pos-tax-detail` and `pos-tax-new` page/API pairs, joined by matching
`page.id`. The bounded service-owned fixture migration keeps the four fixed
Odoo-shaped rows, adds one deterministic archived row, and adds row-versioned
amount, distribution, company, country, and advanced tax fields. Read uses
`pos.read`; create, update, archive/restore, duplicate, and delete use
`pos.manage`. Focused coverage includes search, active filtering, empty and
missing states, transport declarations, validation, duplicate-name guards,
stale writes, and all requested mutation boundaries.

Authenticated Odoo reference captures were taken at both target viewports. The
Core3 browser capture was not completed before the user-requested interruption;
it is explicitly deferred rather than represented as verified evidence.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Taxes list | 1440×900 | `/tmp/odoo-pos-taxes-list-desktop-1440x900-20260911.png` | `849bfa312efc0759e33bd2760868df637eb48e948a4f4713d5579c0cffea34dc` |
| Odoo Taxes list | 390×844 | `/tmp/odoo-pos-taxes-list-mobile-390x844-20260911.png` | `204faba11e779d39133a4d0cba70c1edc82694765ac7fd53d88a723a28c60a9b` |
| Odoo Tax detail | 1440×900 | `/tmp/odoo-pos-taxes-detail-desktop-1440x900-20260911.png` | `e020d8529467b8a52f1f8e9e114db36fe27f886251829cb8735326be92c3ea43` |
| Odoo Tax detail | 390×844 | `/tmp/odoo-pos-taxes-detail-mobile-390x844-20260911.png` | `bc227eb0e9fb6adebedc0cd22fb1b55291f012402e37fc2ddc4a4a0a27c2d43a` |
| Odoo New Tax | 1440×900 | `/tmp/odoo-pos-taxes-new-desktop-1440x900-20260911.png` | `3cf5026b45ad9216a041cd001bde61a84ec39382bfc567ff6e2265612be3dd4b` |
| Odoo New Tax | 390×844 | `/tmp/odoo-pos-taxes-new-mobile-390x844-20260911.png` | `b043d2d22b8eacc1aa9ecfd6112ef7e6334765d6198c8f6cdc39a6ec7a7a5368` |

Residuals and deferred evidence: Core3 list/detail/new paired screenshots,
authenticated cashier-vs-manager browser proof, exact Odoo shell/icon parity,
tax distribution line editing, and chatter are deferred. No screenshots are
committed.

## Current bounded batch: tax distribution-line editing

The source/reference gate is positive. In the owned Odoo 19 database, action
368 (`account.action_tax_form`) opens `/odoo/taxes`; the `15%` record at
`/odoo/taxes/1` is populated with invoice repartition lines 1 and 2 and refund
repartition lines 3 and 4. The embedded `account.tax.repartition.line` list is
`editable="bottom"` with create/delete enabled and exposes Sequence, `%`, Based
On (`Base`/`of tax`), Account, Tax Grids, and the optional Tax Closing Entry.
The source model requires paired invoice/refund distributions, exactly one
base line per document, and a positive tax allocation totaling 100%. Odoo's
access CSV grants mutation of taxes and repartition lines to the accounting
manager; ordinary users retain read access.

Core3 implements only the deferred x2many slice on the existing
`pos-tax-detail` page. The two page/API contracts remain separate and join by
`page.id`; invoice and refund grids use service-owned
`pos_tax_distribution_lines` fixtures. Line create, update, and delete are
permissioned with `pos.manage`, parent and line `row_version` guards, missing
parent/line handling, invalid percentage/basis/account validation, required
tax-line protection, and explicit empty/not-found/transport datasource states.
The update also refreshes the tax's persisted invoice/refund distribution
summary. The bounded Core3 contract uses deterministic text account/tax-grid
projections; sequence drag-reordering, account/tag many2one/many2many pickers,
cross-document atomic editing, and chatter remain residuals.

Focused coverage passes 3 tests and 28 assertions. Audit, ESLint, global CSS
build, and `git diff --check` pass. Screenshots are temporary `/tmp` evidence
and are not committed.

## Pricelists action 2 form bounded slice (2026-09-12)

Odoo's `product_pricelist_action2` exposes list, kanban, and form views with
Sales Prices rule lines. Core3 adds `/point-of-sale/pricelist-detail`, keeps
the list/detail page and API fragments joined by `page.id`, and adds
deterministic rule fixtures with guarded pricelist and rule CRUD, validation,
stale-row, empty, missing, and permission states. Migration
`20260912120000-040-pos-pricelist-detail.yaml` is idempotent.

The focused test passes 2 tests and 20 assertions. Capture was attempted under
`/tmp/core3-odoo-parity/pos-batch6-20260912/`, but Vite hit the host
`EMFILE` watcher limit before a paired Core3 pass; no visual parity claim or
screenshot is made. Images remain outside Git.

## Sales Details wizard bounded slice (2026-09-12)

Core3 completes the Odoo POS Sales Details action 703 through the visible report action and wizard route. The page/API contract preserves `page.id`, deterministic configuration-selection fixtures, date filters, empty/error states, active-configuration validation, permissioned add/remove selection, and wizard row-version guards. The focused test passes 4 tests and 25 assertions.

The isolated Core3 runtime could not complete startup during this correction:
DuckDB stopped at the pre-existing migration error `Adding columns with
constraints not yet supported`, and Vite then hit the host `EMFILE` watcher
limit. Therefore no current authenticated Core3 render or visual-parity claim
is made for this correction. Odoo browser capture was attempted against the
owned reference, but the action page did not settle before the bounded browser
run timed out. Images remain outside Git; the exact runtime limitations are
recorded here rather than treated as UI evidence.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo tax detail | 1440×900 | `/tmp/odoo-pos-tax-distribution-detail-desktop-1440x900-20260911.png` | `8561f5d5ee046c3b37d3a1ed4718533fc9a6133be87a72e1f4d55bf49b92ecb5` |
| Odoo tax detail | 390×844 | `/tmp/odoo-pos-tax-distribution-detail-mobile-390x844-20260911.png` | `4a97d265029d5f6b3f0a269ad2a24232b547ec4d49a7efa9d1fbdd2cc178ead3` |
| Core3 tax detail | 1440×900 | `/tmp/core3-pos-tax-distribution-detail-desktop-1440x900-20260911.png` | `8d057f6149c767177b974bde6c57f8117430bae115193b4a8eb2190ddf9ed5e3` |
| Core3 edited invoice line | 1440×900 | `/tmp/core3-pos-tax-distribution-edited-desktop-1440x900-20260911.png` | `43df49382107c3eed0722e40f787aefd5bfb13f7b0a664637b6a748d0f34b6d3` |
| Core3 edited invoice line | 390×844 | `/tmp/core3-pos-tax-distribution-edited-mobile-390x844-20260911.png` | `83cc0bc718438bcdadc0c9fee292c530d85ecad6068875c19c63edd9b30c9387` |

## Approved bounded batch: Products Activity view

The fresh authenticated Odoo 19 reference exposes Point of Sale → Products as
action 916 (`product.template`) with `kanban,list,form,activity` views. The
desktop Activity view is a matrix headed `To-Do`, `Email`, `Call`, `Meeting`,
and `Document`, with a `Record` column, product name/internal reference rows,
the pager, the Point of Sale search facet, and the footer action `Schedule
activity`. The observed demo state contains `Office Lamp [FURN_8888]` and
`Flipover [FURN_9001]` rows with empty activity cells. On the 390×844 reference,
Odoo keeps the compact product kanban state and hides the desktop-only Activity
view; the page remains exactly viewport width.

The bounded Core3 contract is to add the Activity view to the existing
`/point-of-sale/products` page without adding a second menu or route. Page YAML
and API YAML remain separate and continue to join through `page.id`
`pos-products`. The existing service-owned product fixtures provide the
activity rows through a migration-owned `pos_product_activities` projection;
no page-local records or images are allowed. The activity projection includes
deterministic product id, name/reference, activity type, summary, due date,
user, state, and count fields, and supports the existing search plus explicit
empty and transport-error datasource states.

The desktop view contract uses the existing `ListView` and `ActivityView`
primitives with visible `Kanban`, `List`, and `Activity` tabs, the existing
product row navigation, and `mobile: false` for Activity. Product list and
detail reads require `pos.read`; `Schedule activity` requires `pos.write` and
uses a guarded YAML mutation that validates the selected product, activity
type, and non-empty note before persisting a deterministic activity fixture and
refreshing the product source. Unknown products, invalid types, blank notes,
forbidden writes, empty results, and a 503 datasource error are explicit
contract states.

Acceptance requires focused integration coverage for the exact page/API join,
view/tab and activity-type labels, service-owned fixture projection, search,
empty/error states, product row navigation, schedule permission/validation,
and persistence/refresh. Authenticated Odoo and Core3 captures must be
compared at 1440×900 for the Activity matrix and at 390×844 for the compact
responsive product state, with zero unexpected responses, zero page errors, and
no horizontal overflow. Screenshots remain under `/tmp` and are never
committed.

### Products Activity implementation handoff

Implementation is committed as `b63c85ef7840bcfee64740c7fec7919c1f4bd62e`
(`feat(pos): add products activity view`). It adds migration `0.0.37`, the
service-owned activity-slot projection, the page/API view contract, guarded
`pos.write` scheduling, and the shared ActivityView rule that excludes rows
with no activity count/type. The earlier contract approval is committed
separately as `a99f3227cfc6d51c3e36afd3dc12e90ccce88bf0`.

Focused integration coverage passes 3 tests and 21 assertions. The UI audit
passes with 513 pages, 520 routes, and 905 datasources; focused ESLint, POS
CSS generation, and `git diff --check` pass. The authenticated browser pass
has zero page errors and zero failed requests after the page settles. The
footer schedule flow was exercised with a valid activity and with blank-form
validation; the persisted activity refreshed into the To-Do cell. Empty and
transport-error fixtures, invalid type, unknown product, blank summary, and
stale version guards are covered by the focused contract suite.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Products Activity | 1440×900 | `/tmp/odoo-pos-products-activity-desktop-1440x900.png` | `fb80d86b0605570c7c13941275b0d5534d427077c822facb47996d51f3ab72c3` |
| Odoo Products responsive kanban | 390×844 | `/tmp/odoo-pos-products-activity-mobile-390x844.png` | `389309c303646c87c850414c500600e435c3890e394d25590593e7968ecd18d8` |
| Core3 Products Activity | 1440×900 | `/tmp/core3-pos-products-activity-final-desktop-1440x900.png` | `4c69bb325d0d0648565f1e1ff11aed00741c1cb02f6e2f05aab0cffcbc3e43a8` |
| Core3 Products responsive kanban | 390×844 | `/tmp/core3-pos-products-activity-final-mobile-390x844.png` | `344c0f235105e3469c4e432990cf8eeb7a64890b9024a9afa6eea0a5011079d9` |

Screenshots are temporary `/tmp` evidence and are not committed.

## Current bounded batch: POS Customers > New

The active Odoo 19 reference exposes Customers > New from the Point of Sale
Customers action. The form is a new `res.partner` record with Person/Company
selection, contact and address fields, Contacts, Sales & Purchase, Invoicing,
and Notes tabs, plus standard Save/Discard actions. Core3 adds the
service-owned `pos-customer-new` page/API pair at
`/point-of-sale/customer-new`, keeps the Customers list and form fragments
joined by `page.id`, and changes the customer directory to deterministic
customer records so newly created customers are visible before their first
order.

The bounded mutation is `pos.write` create with required-name, Person/Company,
email-format, and case-insensitive duplicate-name guards. The migration seeds
three stable customers and preserves order totals through the existing POS
order relation. Focused coverage is
`test/pos_customer_new.integration.test.ts`: 3 tests and 23 assertions,
including discovery, deterministic fixtures, list/detail joins, validation,
duplicate rejection, and refresh behavior.

Authenticated browser verification used the active Core3 runtime with
`admin@tms.local` at 1440x900 and 390x844. The form and list render correctly,
the duplicate flow returns HTTP 409 with the expected message, and both
viewports have exact document/body widths. No page errors or HTTP error
responses were observed; the browser only recorded expected aborted bootstrap
and favicon requests. Odoo's mobile probe had unrelated background resource
failures while the form itself rendered.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo POS customer form | 1440x900 | `/tmp/odoo-pos-customer-new-1440x900.png` | `ae65676c556ea06ca2661e6d77116e37224e3fc01d7dab3d23bf1c8afef246b2` |
| Odoo POS customer form | 390x844 | `/tmp/odoo-pos-customer-new-390x844.png` | `a2b0d148287169eaabbab26c0117164bbc36678c16f076f9a112df863696663b` |
| Core3 POS customer form | 1440x900 | `/tmp/core3-pos-customer-new-current-1440x900.png` | `50219f42a3ac422ff057ede9e0b554ce26fad2264e94d544f27fb193ff366eab` |
| Core3 POS customer form | 390x844 | `/tmp/core3-pos-customer-new-current-390x844.png` | `385a871039744747f99564862c72361f35feaeddd378b593aeddbc6c72167c29` |

The intended residual is Odoo's purple partner/chatter shell versus Core3's
Fluent form shell and compact responsive layout. Images remain under `/tmp`
and are not committed.

## Current bounded batch: Payment Methods action 479 completion (2026-09-12)

The local Odoo 19 source confirms Configuration → Payment Methods is menu
`menu_pos_payment_method`, action `action_pos_payment_method_form` (479 in the
owned reference), model `pos.payment.method`, and `list,kanban,form` modes.
The menu is visible to `group_pos_manager,group_pos_user`; the action context
groups by Account. The list exposes sequence, name, split transactions,
journal, receivable/outstanding accounts, company, and Point of Sale. The
form exposes method name, split transactions, journal, accounts, company,
Point of Sale, payment method type, terminal integration, and archive state.

Core3 completes the existing `/point-of-sale/payment-methods` action without
adding a route: visible List/Kanban tabs, Account grouping, Active/Archived
filtering, Odoo-shaped list/card fields, and explicit empty, forbidden,
transport, and missing-detail states are service-owned through the existing
`pos-payment-methods` and `pos-payment-method-detail` page/API joins. Migration
`20260912130000-041-pos-payment-method-action.yaml` adds deterministic
sequence, account, split, receivable, payment-type, and terminal fields with
idempotent `ADD COLUMN IF NOT EXISTS` and fixed fixture updates. Manager-only
detail updates retain required-name and stale/optimistic mutation coverage.

Focused POS coverage passes 26 tests and 138 assertions, including the new
action suite’s 3 tests and 23 assertions. `bun run audit` passes with 594
pages, 601 routes, and 1,026 datasources; root ESLint, POS CSS generation,
and `git diff --check` pass.

Authenticated desktop/mobile captures were attempted under
`/tmp/core3-odoo-parity/pos-batch8-20260912/`, but the required interactive
Playwright/js_repl tooling was unavailable and Playwright is not installed in
this worktree. The isolated runtime reached Vite readiness, then backend
migration bootstrap terminated with DuckDB’s parser error
`Adding columns with constraints not yet supported`; `/api/modules` never
became available. No authenticated Core3 render or visual-parity claim is
made, and no screenshots were created or added to Git.

## Current bounded batch: Pricelists New action

The local Odoo 19 source audit on 2026-09-12 traces Point of Sale → Products
→ Pricelists through menu `pos_config_menu_action_product_pricelist` to
`product.product_pricelist_action2` in `point_of_sale/views/product_view.xml`.
The action is `product.pricelist`, uses `list,kanban,form`, and supplies the
context `default_base=list_price`. Its form view `product_pricelist_view` is
titled “Products Price List”, has the `New` flow, fields Pricelist Name,
Currency, Company, Country Groups, and a Sales Prices notebook containing the
Pricelist Rules list. The POS menu is restricted by
`product.group_product_pricelist`; the source access CSV gives POS users read
access and POS managers create/write access.

Core3 adds the visible `New` action to the existing Pricelists list and the
service-owned `/point-of-sale/pricelists/new` form. The page and API fragments
join through `pos-pricelist-new`; the form preserves the Odoo field labels,
placeholder/default values, two-column desktop grouping, responsive form
composition, and Sales Prices tab. New price rules remain deferred until the
parent pricelist is saved, matching the existing saved-parent x2many contract.
Creation is guarded by `pos.manage` (cashiers with `pos.write` can read the
route but cannot see/submit Save), with required-field, duplicate-name, and
transport-error boundaries. The existing list/detail read access remains
`pos.read`.

Focused coverage passes 2 tests and 13 assertions for the exact page/API join,
Odoo labels/tab, deterministic defaults, cashier-versus-manager permission
boundary, creation, duplicate rejection, and required-name validation. The
UI audit and ESLint pass, and `git diff --check` is clean.

Authenticated Core3 and Odoo captures at 1440×900 and 390×844 were attempted
under `/tmp/core3-odoo-parity/pos-batch9-20260912/`. This session does not
expose the required Playwright `js_repl` browser tool, and the fallback runtime
probe failed before `/api/modules`: Vite exited with the exact host watcher
error `EMFILE: too many open files` while watching
`sdk/bun/sample/vite.config.ts`; the backend then stopped. No screenshots were
created, and this batch makes no visual-parity claim. The bounded residuals
are the unavailable browser evidence, Odoo purple shell/chatter, and adding
Sales Prices lines after the new parent is saved.

## Current bounded batch: Products > New Product action

The local Odoo 19 source audit on 2026-09-12 traces Point of Sale → Products
to menu `menu_pos_products` and action `product_template_action_pos_product`
in `addons/point_of_sale/views/product_view.xml`. The action uses
`kanban,list,form,activity`, defaults `available_in_pos` to true, and exposes
the separate `product_template_action_add_pos` New Product form action as a
medium dialog. Its POS-visible fields include Product, Barcode, Category,
Sales Price, Customer Taxes, and Point of Sale availability; the source
product form also provides General Information and Point of Sale tabs.

Core3 now adds the visible `New` action to `/point-of-sale/products` and a
service-owned `/point-of-sale/products/new` form. The page and API fragments
join through `pos-product-new`; the form defaults Category to General, Sales
Price to 1, Customer Taxes to 10, and Available in Point of Sale to true.
Creation is guarded by `pos.manage` while the page and datasource retain
`pos.read`, preserving cashier read-only access. Required-name, duplicate,
negative-price, and tax-range validation are service mutation guards. The
existing `pos_products` table is reused and migration `0.0.42` is an
idempotent compatibility checkpoint because no schema expansion is needed.

Focused coverage passes 2 tests and 14 assertions in
`test/pos_product_new.integration.test.ts`, including the exact menu action,
page/API join, deterministic defaults, manager-only create action, successful
insert, and validation/duplicate boundaries. The Products Activity and
Product Variants regression suites also pass: 10 tests and 75 assertions
combined. The UI audit passes with 621 pages, 630 routes, and 1,065
datasources; targeted ESLint, POS CSS generation, and `git diff --check` pass.

Authenticated Core3 and Odoo captures were attempted under
`/tmp/core3-odoo-parity/pos-products-new-20260912/`. This session does not
expose the required Playwright/js_repl tool and `import('playwright')` fails
with `ERR_MODULE_NOT_FOUND`. The fallback Core3 runtime reached its startup
banner but Vite exited before `/api/modules` with the exact host error
`EMFILE: too many open files` while watching
`sdk/bun/sample/vite.config.ts`. Therefore no authenticated render,
screenshot, or visual-parity claim is made for this batch. Odoo browser
capture was not claimed because the paired Core3 surface was unavailable.
Screenshots remain outside Git; the residuals are browser/runtime evidence,
the Odoo purple shell/chatter, and the broader generic product fields and
attribute-line workflow.
