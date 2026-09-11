# Purchase UI parity — sub-plan

Status: `in-progress`

## Reference gate and evidence

- Odoo addon/version: `purchase`, Odoo 19 Community source checkout at
  `/home/nhanjs/projects/odoo/addons/purchase`.
- Source manifest: `/home/nhanjs/projects/odoo/addons/purchase/__manifest__.py`.
  It depends on `account`, is an application, and declares official demo data
  in `data/purchase_demo.xml`.
- Authenticated live reference checked on 2026-09-11 at
  `http://localhost:8069`, database `core3_personal`, server version
  `19.0-20260908`, as `codex@core3.local`.
- Purchase is installed with official demo data enabled. The live RFQ route
  contains 12 records and the live Purchase Orders route contains 4 records;
  the installed reference captures are under `/tmp/odoo-purchase/`:
  `list-desktop.png`, `kanban-desktop.png`, `pivot-desktop.png`,
  `graph-desktop.png`, `calendar-desktop.png`, `activity-desktop.png`,
  `desktop-orders.png`, `mobile-orders.png`, `desktop-order-p00012.png`, and
  `mobile-order-p00012.png`. They are local evidence only and are not
  committed.

### Installed reference menu and responsive evidence

The visible Purchase application menu is exactly:

| Top menu | Visible entries and authenticated route |
| --- | --- |
| Orders | `Requests for Quotation` (`/odoo/purchase`), `Purchase Orders` (`/odoo/purchase-orders`), `Vendors` (`/odoo/vendors`) |
| Products | `Products` (`/odoo/purchase-products`), `Product Variants` (`/odoo/action-694`) |
| Reporting | `Purchase` (`/odoo/purchase-analysis`) |
| Configuration | `Settings` (`/odoo/action-642` in the owned database), `Vendor Pricelists` (`/odoo/action-239`), `Attributes` (`/odoo/attributes`), `Categories` (`/odoo/product-categories`) |

The source inventory also contains group-gated `Units & Packagings`; it was
not visible to `codex@core3.local` in this installed reference and remains a
manager/UoM-group follow-up rather than an observed visible menu entry.

On a 1440x900 desktop, `/odoo/purchase` and `/odoo/purchase-orders` expose
visible `List`, `Kanban`, `Pivot`, `Graph`, `Calendar`, and `Activity` view
switches. RFQ list rows show `Reference`, `Vendor`, `Company`, `Buyer`,
`Order Deadline`, `Activities`, `Total`, and `Status`; Purchase Orders rows
show `Reference`, `Confirmation Date`, `Vendor`, `Company`, `Buyer`,
`Activities`, `Source`, `Total`, `Billing Status`, and `Expected Arrival`.
Both populated routes fit the viewport without horizontal overflow.

On a 390x844 touch viewport, both list routes select `Kanban` and use compact
cards; the top menu becomes `Toggle menu`, the `New` and `Actions menu`
controls remain available, and there is no horizontal overflow. Selecting
`P00012` navigates to `/odoo/purchase-orders/12` at both sizes. Desktop detail
shows `Bill Matching`, `Price Comparison`, `Receipt`, `Receive`, `Upload Bill`,
`Send PO`, `Acknowledge`, `Print`, `Cancel`, the Products table, totals, and
chatter. Mobile keeps `Receive` in the compact header, collapses the two
product rows into cards with `Add Order Lines`, and preserves totals/chatter
without horizontal overflow.

## Bounded Purchase Orders batch delivered

The isolated batch implements the coherent Purchase Orders list/detail seam:

- Core3 routes are `/purchase/purchase-orders` and
  `/purchase/detail?id=<stable-order-id>`, with the visible manifest entry
  `Purchase Orders` under `Operations`.
- `services/purchase/api/purchase-orders.yaml` and
  `services/purchase/api/purchase-detail.yaml` own the datasource contracts by
  matching `page.id`; page YAML remains layout-only.
- Migration `20260910150000-004-purchase-orders-ui-demo.yaml` adds three fixed
  purchase orders to the existing confirmed record, covering `Confirmed` and
  `Received`, partial/full receipt, billing status, vendor, buyer, expected
  arrival, reference, notes, lock, and acknowledgement fields.
- The desktop list exposes Odoo-labeled `List`, `Kanban`, `Calendar`, `Pivot`,
  `Graph`, and `Activity` tabs. The pivot datasource declares its safe fields,
  and the table is constrained to an internal horizontal control rather than
  expanding the page.
- The mobile list uses the shared flat `Cards` fallback while hiding the
  desktop-only grouped Kanban; tapping a card navigates to the detail route at
  390px without overflow. A late-bound shared ListView action callback fixes
  card navigation when page actions attach after the first render.
- Focused fixtures cover populated ordering, vendor/product search, status
  filtering, no-match/empty list, not-found detail, and route/API permission
  boundaries. Dispatcher browser access receives the expected 403 page state.

Core3 comparison captures are local under `/tmp`:
`core3-purchase-orders-desktop-final3.png`,
`core3-purchase-orders-mobile-final3.png`,
`core3-purchase-order-detail-desktop-final3.png`,
`core3-purchase-order-detail-mobile-final3.png`,
`core3-purchase-orders-pivot-desktop-final3.png`,
`core3-purchase-empty-final.png`, `core3-purchase-no_match-final.png`,
`core3-purchase-not_found-final.png`, and
`core3-purchase-denied-final.png`. They are deliberately not committed.

The remaining reference limitation is scope, not environment: this batch has
one live installed Odoo detail capture (`P00012`) and does not yet clone the
other Purchase menu families, manager/UoM-gated entries, all order states,
multi-line/section/note order editing, chatter actions, portal routes, or the
full product/configuration/reporting contracts. Those remain open follow-up
gates in this sub-plan.

## Product Variants bounded follow-up

Core3 now exposes `/purchase/product-variants` under the Products menu. The
page/API pair is joined by `page.id`, migration `20260910195000-008` projects
105 deterministic variants from the purchased product catalog, and the shared
ListView provides Odoo-shaped Kanban, List, Activity, search, Active/Archived,
empty, and responsive card states. Authenticated Core3 checks at 1440x900 and
390x844 reached the route with all 105 records, no failed requests, and no
horizontal overflow. Captures are local under `/tmp/core3-purchase-variants-*`.

The installed Odoo action 694 was also captured at both target viewports, but
the reference itself currently fails before rendering with an `active_ids`
Python-expression evaluation error. Those screenshots remain under
`/tmp/odoo-purchase-variants/`; they are recorded as an Odoo reference defect,
not presented as visual parity evidence.

## Source-defined menu and action inventory

The ordinary authenticated Purchase application is defined by
`views/purchase_views.xml`, `views/product_views.xml`,
`report/purchase_report_views.xml`, and `views/res_config_settings_views.xml`.
Group-gated entries must be exercised for both a Purchase User and a Purchase
Manager/System user; product variants and units additionally depend on their
respective groups.

| Menu family | Visible menu/action | Source action/model | View modes or state |
| --- | --- | --- | --- |
| Orders | Vendors | inherited `account.res_partner_action_supplier` / `res.partner` | supplier list/form/search and vendor relational dialogs |
| Orders | Requests for Quotation | `purchase_rfq` / `purchase.order` | list, kanban, form, pivot, graph, calendar, activity; `quotation_only` context |
| Orders | Purchase Orders | `purchase_form_action` / `purchase.order` | list, kanban, form, pivot, graph, calendar, activity; domain `state = purchase` |
| Products | Products | `product_normal_action_puchased` / `product.template` | kanban, list, form, activity; purchase filter and create empty state |
| Products | Product Variants | `product_product_action` / `product.product` | list, kanban, form, activity; variant-group gated |
| Configuration | Vendor Pricelists / supplier information | `product.product_supplierinfo_type_action` | supplier-pricelist list/form/search and product/vendor relation |
| Configuration → Products | Attributes | `product.attribute_action` | list, kanban/form as provided by Product; product-variant-group gated |
| Configuration → Products | Product Categories | `product.product_category_action_form` | category list/kanban/form |
| Configuration → Products | Units & Packagings | `uom.product_uom_form_action` | unit/packaging list/form; UoM-group gated |
| Configuration | Settings | `action_purchase_configuration` / `res.config.settings` | one settings form; Purchase Manager menu additionally system-group gated |
| Reporting | Purchase | `action_purchase_order_report_all` / `purchase.report` | graph, pivot by action; source also defines list/search views |

The source action paths explicitly declared with Odoo 19 `path` are:

- `/odoo/purchase` — RFQs (`purchase_rfq`).
- `/odoo/purchase-orders` — confirmed Purchase Orders
  (`purchase_form_action`).
- `/odoo/purchase-products` — Products
  (`product_normal_action_puchased`).
- `/odoo/purchase-analysis` — Purchase Analysis
  (`action_purchase_order_report_all`).

The other menu actions have no explicit `path` in this addon; their eventual
web URL is runtime-generated and must be recorded from the installed browser,
not guessed from XML IDs. The addon also defines authenticated website/portal
routes in `controllers/portal.py`: `/my/rfq`, `/my/rfq/page/<page>`,
`/my/purchase`, `/my/purchase/page/<page>`, `/my/purchase/<order_id>`, its
JSON-RPC `/update` endpoint, and `/download_edi`. Portal parity is out of this
backend Purchase application batch unless explicitly added to the parent plan.

## Vendor Pricelists bounded follow-up

Core3 now exposes `/purchase/vendor-pricelists` under Purchase → Configuration,
owned by `services/purchase/api/vendor-pricelists.yaml`. Migration
`20260910200000-009-purchase-vendor-pricelists.yaml` seeds 27 stable supplier
information rows matching the installed Odoo Vendor Pricelists action 206,
including vendor/product/company, unit, unit price, minimum quantity, and lead
time. The shared ListView provides the desktop table and responsive mobile card
fallback, active-product filter, search, empty state, and permissioned New
form with nonnegative-price/lead-time and positive-minimum-quantity guards.
Odoo references are `/tmp/odoo-purchase-vendor-pricelists-desktop.png` and
`/tmp/odoo-purchase-vendor-pricelists-mobile.png`; the older action 239 noted
above is stale and opens Discuss in the current database.

## Product Categories bounded follow-up

The next visible Purchase menu gap was Configuration → Categories, reached in
the installed Odoo reference at `/odoo/product-categories`. The exact visible
menu order captured before implementation is:

| Purchase menu | Entries |
| --- | --- |
| Orders | Requests for Quotation, Purchase Orders, Vendors |
| Products | Products, Product Variants |
| Reporting | Purchase |
| Configuration | Settings, Vendor Pricelists, Attributes, Categories, Units & Packagings |

Odoo Categories is a single-column list titled `Categories` with `New`,
actions, search, pager, a selection column, and the one visible column
`Product Category`. The authenticated reference contains the deterministic
records `Clothes`, `Expenses`, `Food`, `Furniture`, `Furniture / Office`,
`Furniture / Outdoor`, `Goods`, `Home Construction`, `Services`, and
`Services / Events`. Selecting `Furniture` reaches the form with the `30
Products` stat button, `Category`, `LOGISTICS`, and `INVENTORY VALUATION`
sections, disabled packaging radio choices, costing/valuation fields, and
`Send message` / `Log note` chatter controls. Both desktop and mobile fit
without horizontal overflow; mobile stacks the form sections and keeps the
chatter composer controls at the bottom.

Core3 now exposes `/purchase/product-categories` and
`/purchase/product-categories/detail?id=purchase-category-furniture`. The
page/API pairs are joined by `page.id`; migration
`20260910210000-010-purchase-product-categories.yaml` owns ten stable
category fixtures plus the created-message fixture. The list provides the
selection column, search, pager, row navigation, empty state, and permissioned
New form. The detail provides the product stat navigation, permissioned edit
form with a shared read-only/editable radio primitive, and permissioned
chatter message/note actions. Duplicate names, missing records, stale row
versions, and chatter guards are declared in the API contract; deterministic
rows, search, empty/not-found fixtures, menu ordering, page-id binding, and
read/write action permissions are covered by
`test/purchase_product_categories.integration.test.ts`.

Comparison captures are local only:

- Odoo: `/tmp/odoo-purchase-categories-desktop.png`,
  `/tmp/odoo-purchase-categories-mobile.png`,
  `/tmp/odoo-purchase-categories-detail-exact.png`, and
  `/tmp/odoo-purchase-categories-detail-mobile.png`.
- Core3: `/tmp/core3-purchase-categories-list-desktop-final.png`,
  `/tmp/core3-purchase-categories-list-mobile-styled.png`,
  `/tmp/core3-purchase-categories-detail-desktop-final.png`, and
  `/tmp/core3-purchase-categories-detail-mobile-final.png`.

The shared Core3 shell intentionally retains its existing Fluent-style header
and toolbar rather than copying Odoo's purple shell; the category-specific
list structure, labels, selection affordance, form section ordering, radio
choices, chatter, responsive stacking, and deterministic record content match
the captured reference. The isolated runtime required the normal generated
stylesheet build before browser capture; generated CSS is ignored and was not
committed.

## Attributes bounded follow-up (selected 2026-09-10)

The next uncovered visible Purchase action was selected from the live
`core3_owned` menu as `Configuration → Products → Attributes`. Odoo 19 exposes
the shared product-configuration route `/odoo/attributes` with 11 seeded
records and columns `Attribute`, `Display Type`, and `Variant Creation`.
Opening `Brand` reaches `/odoo/attributes/1` and shows the editable attribute
fields plus the `Attribute Values` table with `Value`, `Free text`, and
`Default Extra Price`. The same list and form fit the authenticated 1440×900
desktop and 390×844 touch viewports without horizontal overflow. The direct
route uses Odoo's shared Inventory/Product configuration shell; it is recorded
as reference behavior rather than treated as a Purchase-only shell.

The Core3 slice adds `/purchase/attributes` and
`/purchase/attributes/detail?id=<stable-attribute-id>`, the manifest entry
under Purchase → Configuration, and page/API YAML pairs joined by
`purchase-product-attributes` and `purchase-product-attribute-detail`. Migration
`20260910103000-011-purchase-attributes.yaml` seeds the 11 deterministic
attributes and the observed Brand values, with idempotent re-run behavior.
`purchase.read` protects both routes and `purchase.write` protects create and
update; duplicate-name, missing-record, and stale-row-version guards are
covered by the focused integration test.

Core3 renders the value rows through the shared `LineItemGrid` as read-only
embedded data. Adding, deleting, or editing individual value rows, Odoo's
radio presentation, and the purple/shared product shell remain follow-up gaps;
the primary attribute list/form and responsive route are the bounded claim for
this batch. Local comparison captures are `/tmp/core3-purchase-attributes-*`
and `/tmp/odoo-purchase-attributes-*`; screenshots remain outside Git.

## Purchase Settings bounded follow-up (selected 2026-09-10)

The current owned Odoo database resolves `purchase.action_purchase_configuration`
to action `642` (the earlier `action-704` identifier belonged to the previous
reference database). Its authenticated form-only view was captured at
1440x900 and 390x844 from `/odoo/action-642`. The visible Purchase settings are
the Orders, Invoicing, Products, and inherited Logistics blocks; the current
owned reference has no failed responses or horizontal overflow.

Core3 now exposes `/purchase/settings` through the existing Purchase
Configuration menu. The page/API pair is joined by `page.id` (`purchase-settings`)
and uses the shared `SettingsView`; `api/settings.yaml` owns the
`purchase_settings` datasource and guarded `purchase.settings.update` mutation.
Migration `20260910220000-012-purchase-settings.yaml` seeds the fixed
Purchase flags and row version, with idempotent re-run behavior. The explicit
`purchase.settings` permission keeps the system-gated Settings action separate
from ordinary Purchase read/write access; stale row versions and missing rows
return guarded errors. Odoo's form-only mode is represented by the settings
page rather than inventing list or report tabs. The optional Enterprise
3-way-matching control is visible but disabled, matching the owned reference.

Authenticated Core3 captures are `/tmp/core3-purchase-settings-desktop-final.png`
and `/tmp/core3-purchase-settings-mobile-final.png`; owned Odoo captures are
`/tmp/odoo-purchase-settings-desktop-final.png` and
`/tmp/odoo-purchase-settings-mobile-final.png`. Core3 desktop/mobile checks
reported zero failed responses, zero console errors, 1440/1440 and 390/390
body widths, and only the settings content region scrolling. A real checkbox
save, reload persistence check, and revert cycle also passed. Screenshots stay
outside Git.

The shared shell remains Fluent-style rather than copying Odoo's purple shell;
the Purchase settings labels, section order, disabled optional setting,
full-width surface, and responsive content behavior are the bounded parity
claim. Cross-application Settings navigation and installation of optional
modules remain shared-shell follow-ups.

## Units & Packagings bounded follow-up (selected 2026-09-10)

The owned Odoo 19 database `core3_owned` was audited while authenticated as
`codex@core3.local` at `http://localhost:8069` on both 1440x900 and 390x844.
Purchase → Configuration → Products → Units & Packagings resolves to action
90 (`uom.uom`, `list,form`) and contains 21 deterministic rows. The list
columns are `Unit Name`, `Contains`, and `Reference Unit`; the form exposes
`Unit Name`, `Quantity`, and the reference unit. Odoo references are local
only under `/tmp/odoo-purchase-units-packagings-{desktop,mobile}-{list,form}.png`.

Core3 now exposes `/purchase/units-packagings` and the page-id-bound detail
route `/purchase/units-packagings/detail`. The layout-only pages use the
shared `ListView` Odoo variant and `OdooFormView`; API fragments own the
datasources and guarded server mutations. Migration
`20260910230000-013-purchase-units-packagings.yaml` seeds the observed 21
rows with stable IDs and Odoo ordering. The focused integration test covers
search, empty/not-found and transport errors, purchase read/write permission
boundaries, create/update/delete, duplicate names, positive-quantity
validation, and stale row versions.

Authenticated Core3 evidence is local only under
`/tmp/core3-purchase-units-packagings-{desktop,mobile}-{list,form}-final.png`.
Desktop uses the Odoo-shaped table; the shared responsive ListView uses
compact cards on mobile to avoid the component's intentional desktop table
minimum width. Packaging Barcodes is recorded as a follow-up because the
owned fixture has no barcode action/data contract in this bounded slice. The
shared Core3 Fluent shell also remains distinct from Odoo's purple shell.

## Vendors bounded follow-up (selected 2026-09-10)

The owned Odoo 19 database `core3_owned` was queried while authenticated as
`codex@core3.local` at `http://localhost:8069`. Purchase → Orders → Vendors
resolves to the inherited `account.res_partner_action_supplier` action 302,
with path `/odoo/vendors`, model `res.partner`, and `list,kanban,form` views.
Its supplier context defaults the list to supplier partners and the live
database currently contains the deterministic demo suppliers `Gemini
Furniture` and `Ready Mat`; the supplier form also exposes purchase-order
stat context and the purchase-specific receipt-reminder/buyer extensions.

Core3 completes the existing Vendors scaffold at `/purchase/vendors` and
`/purchase/vendors/detail?id=<stable-vendor-id>`. The layout-only list/detail pages are
bound to `api/vendors.yaml` and `api/vendor-detail.yaml` by matching
`page.id`; `vendor-workflow.yaml` owns the Active → Inactive lifecycle.
Migration `20260910240000-014-purchase-vendors.yaml` adds stable, realistic
supplier fixtures, including Odoo-shaped Gemini Furniture and Ready Mat rows
plus an archived supplier for the inactive state. The list defaults to active
vendors, supports All/Active/Inactive filtering and supplier/contact/location
search, and switches to compact Kanban cards on mobile. The detail exposes
contact/address/purchase fields and a Purchases stat navigation action.

Vendor create/update/delete actions require `purchase.manage`, while both
routes and navigation require `purchase.read`. Names must be non-empty and
unique; edits require a row version; vendors with purchase orders cannot be
deleted; active vendors with open purchase orders cannot be archived; and
archive/restore transitions reject invalid source states. List/detail
transport errors, empty/no-match/not-found fixtures, lifecycle guards, CRUD,
duplicate, in-use, stale-version, and permission declarations are covered by
`test/purchase_vendors.integration.test.ts`.

The authenticated Odoo evidence for this batch is an RPC action/model audit;
an authenticated Core3 desktop/mobile browser capture was not completed in
this environment because the persistent Playwright browser interface was not
available. Screenshots, if captured later, remain local under `/tmp` and are
not part of the commit. The shared Core3 Fluent shell remains distinct from
Odoo's purple shell.

## Purchase Products product detail bounded follow-up (selected 2026-09-11)

The authenticated personal Odoo menu audit resolves Purchase → Products →
Products to action `693` (`product_normal_action_puchased`) at
`/odoo/purchase-products`. The installed demo database currently shows 153
products; selecting the deterministic visible `Acoustic Bloc Screens` record
opens `/odoo/purchase-products/23`. At 1440×900 the detail exposes product
stats, Sales/Expenses/Point of Sale/Purchase flags, General Information,
Attributes & Variants, Sales, Point of Sale, Purchase, Inventory, price/cost,
category/company, and chatter. At 390×844 the same form stacks responsively
without horizontal overflow. Authenticated reference captures are local only:
`/tmp/odoo-purchase-product-detail-desktop-acoustic-20260911.png` and
`/tmp/odoo-purchase-product-detail-mobile-acoustic-20260911.png`.

Core3 now joins `/purchase/products` to
`/purchase/products/detail?id=<stable-product-id>` through the separate
`pages/purchase-product-detail.yaml` and
`api/purchase-product-detail.yaml` fragments, both keyed by
`page.id: purchase-product-detail`. The Products list opens the detail on
single click/double click. Migration
`20260910250000-015-purchase-product-detail.yaml` adds two fixed Internal Notes
fixtures for `purchase-product-acoustic`; the detail datasource exposes stable
variant/purchased counters and Odoo-shaped product, General Information, and
Purchase fields. Purchase read protects the route/datasources; Purchase write
protects Edit, Archive, Send message, and Log note. Edit requires a row
version, rejects missing/duplicate/blank names, and Archive rejects an already
archived product. The detail explicitly serves default, empty/not-found, and
transport-error datasource states, while the list retains the populated,
search, and empty states.

Focused validation is `test/purchase_product_detail.integration.test.ts`: 3
tests and 28 assertions cover page/API discovery, 105 deterministic products,
search, detail/messages, empty/not-found/transport states, permission
declarations, duplicate/name validation, stale updates, and archive guards.
Authenticated Core3 captures are local only:
`/tmp/core3-purchase-products-desktop-20260911.png`,
`/tmp/core3-purchase-products-mobile-20260911.png`,
`/tmp/core3-purchase-product-detail-desktop-20260911.png`, and
`/tmp/core3-purchase-product-detail-mobile-20260911.png`. Both Core3 viewports
reported zero failed responses, exact document/body widths of 1440/1440 and
390/390, and working Edit → Discard interaction.

The bounded visual claim covers the shared Core3 form hierarchy, responsive
stacking, product stats, Purchase/Sales/Chatter tabs, deterministic field
values, and Internal Notes. The Fluent Core3 shell intentionally remains
different from Odoo's purple shell; product photography, Odoo's full stat
strip and extra tabs (Point of Sale, Inventory, Attributes & Variants),
relational tax/selectors, and the richer live activity history are shared
component or datasource follow-ups. Mobile screenshots are viewport captures;
the detail continues vertically below the fold without page overflow.

## Required visible states

- RFQ/order list: populated, empty, loading/error, search by order/vendor/
  product, date filters, status filters, group by vendor/product/order/date,
  optional columns, pager, multi-select, import/export/share and list/kanban/
  calendar/activity/report view switching where available.
- RFQ/order records: official demo-like draft, sent, to-approve, confirmed
  (`purchase`), cancelled, locked/unlocked, acknowledged/unacknowledged,
  invoiced/to-invoice, duplicate-warning, receipt-warning, no-lines and
  permission-denied states. Confirm exact visibility of Send RFQ, Confirm
  Order, Approve Order, Send PO, Acknowledge, Set to Draft, Print, Cancel,
  Lock, Unlock, Send Reminder, Merge RFQs, and Add/Remove Followers.
- Order form: vendor/contact and reference, currency/company, order and
  expected dates, reminder settings, Products notebook, editable order lines,
  product catalog, add product/section/note controls, quantities/UoM,
  received/billed quantities, taxes, analytic distribution, subtotals/totals,
  vendor bills, bill matching, price comparison, chatter, activities,
  attachments, followers, print/email dialogs, and read-only/locked behavior.
- Products and variants: purchase-only filter, list/kanban/form/activity,
  create/edit/archive/empty states, supplier information, purchase prices,
  UoM, taxes, variants/attributes and relational product selectors.
- Analysis: graph, pivot, empty state, date filters and grouping by vendor,
  vendor country, buyer, product, category, status, company, order date and
  confirmation date; measures for ordered/received/billed quantity, untaxed
  total and total.
- Configuration: supplier pricelists, product categories, attributes, units &
  packagings, and Settings sections for order approval/threshold, automatic
  locking, product/vendor warnings, blanket orders/templates, receipt
  reminders, three-way matching, variants, product matrix, and UoM. Include
  disabled optional-module states and group-denied states.
- Responsive behavior: desktop tables/forms and mobile cards/form sections,
  compact headers, overflow action menus, line editing, dialogs and charts;
  no horizontal page scroll beyond an intentionally scrollable table/control.

## Existing Core3 service and parity gap

The existing service is `sdk/bun/sample/services/purchase` with:

- `manifest.yaml`, `permissions.yaml`, `storage.yaml`, foundation/demo/parity
  migrations, and the bounded Purchase Orders demo migration;
- `pages/purchase-orders.yaml`, `purchase-detail.yaml`, `vendors.yaml`,
  `analysis.yaml`, and `purchase-workflow.yaml`;
- `purchase_orders` and `purchase_vendors` storage, a Draft → Sent → Confirmed
  → Received/Cancelled workflow, list/detail/vendor/analysis routes, and
  `/purchase-orders`, `/vendors`, and `/purchase-analysis` menu entries.

It does not yet cover the source menu families for Products, Product Variants,
Vendor Pricelists, Categories, Attributes, Units & Packagings, Settings, or
the reporting graph/pivot contract. Its order model is a single product/quantity
shape and lacks Odoo order lines, sections/notes, taxes/UoM, currencies,
invoicing, approval, locking, acknowledgement, reminders, catalog, price
comparison, bill matching, chatter/activities/attachments, and the
state-specific form and permission rules. Keep frontend page YAML separate from
backend datasource/action YAML: new fragments belong in the convention-
discovered `services/purchase/api/` tree keyed by `page.id`.

## Shared primitives

Reuse and verify generic contracts before adding anything Purchase-specific:

- Odoo shell, application/menu launcher, breadcrumb, control panel, search,
  filters, search panel, group-by, pager, optional columns, bulk actions and
  view switcher;
- `ListView` Odoo variant, responsive list/card/kanban, calendar, activity,
  `Chart`, and `Pivot` with empty/loading/error states;
- `OdooFormView`, notebook/tabs, statusbar/status chips, header/action buttons,
  locked/read-only fields, stat buttons and responsive two-column groups;
- many2one/many2many async selectors, supplier/product catalog dialog,
  editable one2many line editor with section/note rows, UoM/quantity/monetary/
  tax/analytic renderers, date fields and attachment/file controls;
- generic server-form and server-action contracts, guarded workflow mutation,
  confirmation/email/print/reminder/merge/follower dialogs, notifications,
  permission-aware actions, chatter/activity/follower panels, and
  `SettingsView` (full-width content with only content scrolling);
- shared i18n, responsive breakpoint, access-denied, no-data and failure
  primitives. Missing generic capabilities must be recorded with their API
  contract; do not introduce a Purchase-only page renderer.

## Deterministic service-owned datasource/API contract

Every route and view state must be served by stable Purchase API fragments or
queries, never page-local records, random IDs, `CURRENT_DATE`, remote images,
or browser-only fixtures. Preserve stable IDs so a later real query provider
can replace the mock provider without changing UI contracts. Add idempotent
migrations and verify fresh-install and upgrade behavior.

At minimum, fixtures/datasources must cover:

- vendors/contacts, products, variants, attributes, categories, UoMs,
  supplier pricelists, currencies, taxes, companies, buyers and permissions;
- RFQs and orders with multiple lines including product, section and note;
  draft, sent, to-approve, confirmed, cancelled, locked and acknowledged
  records; ordered/received/billed quantities; planned/confirmation dates;
  warnings, duplicate candidates, invoices/bills, activities, attachments,
  followers, messages, analytic distributions and price comparisons;
- list, kanban, form, calendar, activity, graph, pivot, populated and empty
  datasets, bounded search/filter/group/pager results, and deterministic
  analysis measures;
- create/edit line validation, Send/Confirm/Approve/Receive/Cancel/Lock/
  Unlock/Acknowledge/Reset/Print/Reminder/Merge/Follower action responses,
  including invalid transition and stale `row_version` conflicts;
- explicit denied responses for Purchase User vs Purchase Manager, accountant,
  system settings, product-variant and UoM scopes, plus missing optional-module
  and unavailable-addon fallbacks.

Use semantic names and record shapes derived from `purchase_demo.xml` where
useful, but seed explicit fixed dates and IDs. Do not commit screenshots or
binary fixtures; local evidence stays under `/tmp`.

## Current batch: Purchase Analysis Graph and Pivot

The Purchase Analysis action is now page-id bound to
`services/purchase/api/analysis.yaml`. Its deterministic report rows expose
confirmation date/month, vendor, product, state, ordered/received/billed
quantities, and untaxed/total amounts. The layout uses visible `Graph`,
`Pivot`, and `List` tabs, with a line graph defaulting to confirmation date and
a pivot defaulting to Category then Order with Untaxed Total and Total. The
Core3 List tab is a deliberate convenience because the installed Odoo action
is `graph,pivot` only.

## Purchase Analysis final acceptance — 2026-09-10

The owned Odoo database reports addon `purchase` installed at `19.0.1.2` and
action `645` (`Purchase Analysis`, path `purchase-analysis`,
`graph,pivot`). True authenticated Odoo evidence is captured at
`/tmp/core3-purchase-analysis-next-odoo-desktop.png`,
`/tmp/core3-purchase-analysis-next-odoo-mobile.png`, and
`/tmp/core3-purchase-analysis-next-odoo-desktop-pivot.png`. Authenticated
Core3 desktop/mobile Graph, Pivot, List, empty-state, and permission-boundary
checks were exercised under `/tmp/core3-purchase-analysis-next-core3-*.png`;
the focused integration test is the post-change regression evidence for the
final datasource and control contract. No screenshots are committed.

The bounded datasource uses Purchase `order_date` as the confirmation-date
proxy because the current Core3 schema has no approval date; vendor country is
empty, billed quantity is zero, and total equals untaxed total because the
schema has no report-line/tax data. Core3's shared graph primitive also has a
smaller control set than Odoo's chart toolbar. These are documented datasource
and shared-component limits, not hidden Purchase-specific behavior. Mobile
pivot table scrolling is internal to the table and the page remains viewport
fit. A user without `purchase.read` is redirected to the Core3 home route,
which is the current permission boundary rather than an explicit denial page.

## Purchase Vendors visual acceptance — 2026-09-10

The owned Odoo Vendors action is `/odoo/purchase/vendors`; authenticated paired
captures were completed at 1440x900 and 390x844. Core3 captures are
`/tmp/core3-purchase-vendors-desktop.png` and
`/tmp/core3-purchase-vendors-mobile.png`; Odoo captures are
`/tmp/odoo-purchase-vendors-desktop.png` and
`/tmp/odoo-purchase-vendors-mobile.png`. Both surfaces reported zero failed
responses and equal document/body widths to their viewport. Core3 intentionally
uses deterministic five-vendor fixtures while Odoo currently displays two
vendors; the mobile card layout is responsive and functional, but Odoo's
contact logos, activity chips, and tag decorations remain a shared-card parity
gap to address in a future visual refinement. Screenshots remain under `/tmp`.

## Purchase Vendors mobile card refinement — 2026-09-11

A fresh authenticated comparison reproduced the documented mobile mismatch and
was used to refine the existing shared compact-card contract. The Vendors card
now exposes an Odoo-shaped identity block with deterministic initials and
email, phone/location context through the datasource's `location_display`,
colored deterministic vendor-tag badges, a purchase-count metric,
open-order/status details, and a purchase-order footer.
The page remains page-only and continues to bind `services/purchase/api/vendors.yaml`
through `page.id: vendors`; no shared renderer or image asset was added.

The final local captures are `/tmp/parity-vendors-core3-desktop.png`,
`/tmp/parity-vendors-core3-mobile.png`, `/tmp/parity-vendors-odoo-desktop.png`,
and `/tmp/parity-vendors-odoo-mobile.png`. Core3 reported exact 1440px and
390px document/body widths with no failed requests. Odoo reported the same
viewport widths; its missing web asset requests are an environment-level
reference limitation, while the authenticated populated list/kanban DOM was
still captured. The shared compact-card mobile contract now uses Odoo-like
edge-to-edge rows with separators instead of an outer card gutter. The
remaining deliberate difference is Odoo's live contact
logos, colored vendor-tag chips, and activity-icon chips; Core3 now matches the
card hierarchy and responsive information density using the available shared
primitive. Live contact logos and activity-icon chips remain a future shared
card enhancement.

## Acceptance gate

- Every source-visible menu above has a Core3 route, or an explicit documented
  deliberate redirect with the same permission boundary.
- Every explicit Odoo action path and every source view mode/state is covered
  by a page/API contract and an authenticated browser check.
- Desktop and mobile checks assert loaded route/title/menu, visible fixture
  records, responsive fit, no unexpected horizontal overflow, and no failed
  requests; inspect list, kanban, form, calendar/activity, graph, pivot,
  settings, dialogs, empty/error and denied states.
- Workflow actions enforce source-equivalent state and permission guards,
  refresh deterministically, preserve IDs/versioning, and expose the expected
  success/error notification.
- Datasource completeness, stable ordering/totals, fresh migration, upgrade,
  API-fragment discovery, i18n, and YAML schema checks pass; no page-local
  purchase data or product-specific renderer is introduced.
- The owned live addon is installed and action 645 was captured
  authentically for this slice, so the earlier uninstalled-addon fallback is
  superseded here. The remaining bounded datasource and shared-control limits
  are recorded above and do not change the action-ownership result.

## Focused verification commands

From `sdk/bun/sample` after implementation:

```sh
bun run audit
bun run audit:yaml
git diff --check
```

Also run the focused Purchase migration/API/schema check and authenticated
desktop/mobile Playwright matrix used by the parent parity plan. The gate is
not complete until the installed-addon live audit can replace the two
uninstalled fallback observations with real Purchase evidence.
