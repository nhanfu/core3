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

## Purchase Vendor Pricelists detail bounded slice (selected 2026-09-11)

The next uncovered installed visible Purchase action after Products list/detail
was Configuration → Vendor Pricelists. The authenticated personal Odoo menu
maps this action to `/odoo/action-239`, source action
`product.product_supplierinfo_type_action`, with `list,form,kanban` view modes.
The live list showed 29 demo rows and the selected `Wood Corner` row opened
`/odoo/action-239/16`. Odoo's visible list labels are Vendor, Product, Company,
Unit, Unit Price, Currency, and Lead Time. The form labels and sections are
Vendor Information, Vendor Product Name?, Vendor Product Code?, Lead Time?,
Product, Product Variant?, Quantity?, Unit Price?, Validity?, Discount (%), and
Company, grouped under VENDOR and PRICELIST.

Core3 implements the bounded list/detail slice at
`/purchase/vendor-pricelists` and
`/purchase/vendor-pricelists/detail?id=supplierinfo-demo-016`. Page YAML and
API YAML remain separate and are joined by
`page.id: purchase-vendor-pricelists` and
`page.id: purchase-vendor-pricelist-detail`. Migration
`20260911170000-016-purchase-vendor-pricelist-detail.yaml` adds the deterministic
supplier-information fields and seeds 27 stable rows, including vendor
product/code, variant, currency, validity dates, discount, lead time, quantity,
and unit price. The list supports list/card modes, search, row navigation, and
create; the detail supports read, edit, duplicate, delete, and stale-version
guards. Read protects both routes and write protects mutations. The integration
coverage exercises default/search/empty/not-found/transport-error contracts,
permission declarations, required/duplicate/numeric validation, CRUD, and
concurrency guards.

Focused validation:
`test/purchase_vendor_pricelists.integration.test.ts` plus
`test/purchase_vendor_pricelist_detail.integration.test.ts` pass with 4 tests
and 48 assertions. Authenticated browser verification covered the populated
list, `Acoustic` search, row-to-detail navigation, and Edit → Save on
`supplierinfo-demo-027` (Discount (%) changed to 5). Final comparison captures
are local under `/tmp` and are intentionally untracked:

- Odoo: `/tmp/purchase-vendor-pricelist-odoo-desktop-list-20260911c.png`,
  `/tmp/purchase-vendor-pricelist-odoo-desktop-detail-20260911c.png`,
  `/tmp/purchase-vendor-pricelist-odoo-mobile-list-20260911c.png`, and
  `/tmp/purchase-vendor-pricelist-odoo-mobile-detail-20260911c.png`.
- Core3: `/tmp/purchase-vendor-pricelist-core3-desktop-list-20260911c.png`,
  `/tmp/purchase-vendor-pricelist-core3-desktop-detail-20260911c.png`,
  `/tmp/purchase-vendor-pricelist-core3-mobile-list-20260911c.png`, and
  `/tmp/purchase-vendor-pricelist-core3-mobile-detail-20260911c.png`.

The normal populated desktop/mobile matrix reported exact document/body widths
of 1440/1440 and 390/390 with no failed responses. State captures also cover
empty, intentional not-found, intentional transport-error, and dispatcher
permission-denied routes. The transport-error backend contract returns 503
`PURCHASE_VENDOR_PRICELISTS_UNAVAILABLE` or
`PURCHASE_VENDOR_PRICELIST_DETAIL_UNAVAILABLE`; the current shared page
prefetch validator rejects datasource-level `error` metadata before the
Purchase error component can render, so the browser currently shows Core3's
generic invalid-page fallback for that state. Likewise, a dispatcher receives
the expected 403 while the shared shell remains visible. Fixing those shared
renderer behaviors is outside this Purchase-only slice.

Known visual/data limitations are the shared Fluent shell versus Odoo's purple
shell, a separate Currency row where Odoo uses inline currency/UoM widgets,
text-backed relational fields rather than Odoo pickers, and 27 deterministic
Core3 fixtures versus 29 live Odoo rows. The mobile action strip can scroll
internally while the page body remains within the viewport.

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

## Purchase Product History bounded follow-up — 2026-09-11

The next uncovered installed Purchase action was the product form's visible
`Purchased` stat button. In the authenticated personal Odoo database
`core3_personal`, the button on `Acoustic Bloc Screens` opens action `697`
(`Purchase History for Acoustic Bloc Screens`) at
`/odoo/purchase-products/23/action-697`. The installed action exposes `List`,
`Pivot`, and `Graph` views, defaults to `Order Date: Last 365 Days`, and shows
the seeded history line `[FURN_6667] Acoustic Bloc Screens (Black) (1)` with
quantity `20.00` and total untaxed `$ 5,736.00`.

Core3 now routes the product stat to `/purchase/products/history` with the
selected product in `product_name`. The layout-only page/API pair is joined by
`page.id: purchase-product-history`; the API owns the purchase-line query and
its List/Pivot/Graph field contracts. Migration
`20260911195000-017-purchase-product-history.yaml` creates the deterministic
`purchase_product_history` table and seeds four realistic lines, including the
Odoo-shaped Acoustic Bloc Screens row. The product detail's Purchased total is
calculated from the same history source so the stat and report cannot drift.
The focused test covers page/API binding, the stat navigation, deterministic
product/search filtering, empty/not-found/transport states, and the Purchased
total. No write action is invented for this read-only Odoo report.

Authenticated comparison captures are local only and remain outside Git:

- Odoo: `/tmp/odoo-purchase-product-history-desktop-20260911.png`,
  `/tmp/odoo-purchase-product-history-mobile-product-context-20260911.png`,
  `/tmp/odoo-purchase-product-history-desktop-pivot-20260911.png`, and
  `/tmp/odoo-purchase-product-history-desktop-graph-20260911.png`.
- Core3: `/tmp/core3-purchase-product-history-desktop-20260911.png`,
  `/tmp/core3-purchase-product-history-mobile-20260911.png`,
  `/tmp/core3-purchase-product-history-desktop-pivot-20260911.png`, and
  `/tmp/core3-purchase-product-history-desktop-graph-20260911.png`.

The authenticated browser pass used 1440x900 and 390x844 viewports. Odoo and
Core3 both returned zero failed responses and exact document/body widths at
both sizes. The mobile table intentionally scrolls its dense report columns
internally, matching the installed Odoo behavior without widening the page.
Core3 retains the shared Fluent shell while Odoo retains its purple shell;
Core3's Pivot/Graph toolbar and seeded records are the bounded shared-component
parity surface, not a claim that the two global shells are pixel-identical.

## Purchase Product Variants detail bounded follow-up — 2026-09-11

The next uncovered installed visible Purchase action was the Product Variants
form behind Products → Product Variants. The authenticated personal Odoo
action is `694` at `/odoo/action-694`; selecting the deterministic
`FURN_6667` row opens `/odoo/action-694/38` and shows the variant form with
Documents, In / Out, Reordering Rules, Bill of Materials, Purchased, and Sold
stat buttons; General Information, Sales, Point of Sale, Purchase, and
Inventory sections; and OdooBot internal-note history. The same detail route
was captured directly at both target viewports because the mobile action uses
Odoo's compact Kanban list before opening a record.

Core3 now opens the existing Product Variants list rows at
`/purchase/product-variants/detail?id=purchase-variant-purchase-product-acoustic`.
The page/API pair is joined by `page.id: purchase-product-variant-detail`.
Migration `20260911200000-018-purchase-product-variant-detail.yaml` adds the
Odoo-shaped variant fields, deterministic `FURN_6667 / Acoustic Bloc Screens /
Color: Black` data, and three dated internal-note fixtures. The form exposes
the six Odoo stat values, responsive section/notebook hierarchy, and
permissioned Edit, Archive, Send message, and Log note actions. Edit and
Archive require `purchase.write`, reject blank or negative values, reject
duplicate names, and require the current row version; all detail and message
reads require `purchase.read`. Missing, empty, transport-error, and stale
record contracts are covered by
`test/purchase_product_variant_detail.integration.test.ts`.

Focused validation is 3 tests and 25 assertions. Authenticated browser
verification used Odoo `codex@core3.local` and Core3 `admin@tms.local` at
1440×900 and 390×844. Both surfaces returned zero failed requests and no
horizontal overflow; Core3 document/body widths were 1440/1440 on desktop
and 390/390 on mobile. Core3 retains the shared Fluent shell and uses
responsive information cards rather than Odoo's product image and purple
shell; those are shared-shell/asset differences, while the variant identity,
stats, field values, sections, chatter, and mobile stacking are the bounded
parity surface.

Evidence remains local and uncommitted:

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Odoo | `/tmp/odoo-purchase-product-variant-detail-desktop-1440x900.png`<br>SHA-256 `23ed8bc43eacd59a955b2ba23a4eb1ac332800c258d5f370ca664064f535dca1` | `/tmp/odoo-purchase-product-variant-detail-mobile-390x844.png`<br>SHA-256 `35081b0d14c1fff157dff928db22171d719234e3ebd6cf9b434f836047b87d83` |
| Core3 | `/tmp/core3-purchase-product-variant-detail-desktop-1440x900.png`<br>SHA-256 `d362a2fdd7f57f4a170109ba76d9efa3ff8bdb1b166643dbff6aa4c9090307d5` | `/tmp/core3-purchase-product-variant-detail-mobile-390x844.png`<br>SHA-256 `4ed7ed10005e88659b31eadda4dc20019c3bc9cd905dd5686e78c14f3932cf16` |

## Purchase order line editor and RFQ workflow bounded follow-up — 2026-09-11

The next uncovered high-value Purchase form seam was the order-line editor on
the RFQ/Purchase Order form. The authenticated Odoo 19 reference was checked
in the personal `core3_personal` database as `codex@core3.local` at
`/odoo/purchase/7` (`P00007`, RFQ), with the confirmed-order family also
checked at `/odoo/purchase/12` (`P00012`). Odoo exposes the form actions
`Send RFQ`, `Confirm Order`, `Cancel`, and, for the confirmed family,
`Receive`; its Products tab contains product, quantity, unit, unit price,
taxes, amount, add-product/section/note/catalog controls, totals, and the
Other Information tab. The reference has two live lines in each capture and
no failed responses or page overflow.

Core3 now exposes the same bounded form seam at
`/purchase/detail?id=po-demo-001`. The page remains layout-only and is joined
to page-scoped API/action fragments by `page.id: purchase-detail`; the new
`purchase_order_lines` datasource and line-item mutations stay in
`services/purchase/api/purchase-detail.yaml`. Migration
`20260911210000-020-purchase-order-lines.yaml` owns the independent line
table and stable fixtures `purchase-line-demo-001-10`,
`purchase-line-demo-001-20`, and `purchase-line-demo-005-10`; canonical
`purchase_orders` list rows and totals are unchanged. The page adds the
Products/Other Information notebook, responsive line grid, Add/Edit/Delete
line actions, total calculation, and guarded Draft → Sent → Confirmed
workflow actions. The browser payload normalization fix is in `dab532de`.

Focused verification from `sdk/bun/sample` after the implementation and fix:

```text
17 pass
0 fail
172 expect() calls
4 files: purchase.integration.test.ts, purchase_order_lines.integration.test.ts,
purchase_product_detail.integration.test.ts, purchase_product_variant_detail.integration.test.ts
git diff --check: pass
```

The authenticated Core3 browser pass returned zero failed requests and zero
page errors for the clean initial desktop/mobile loads. It also verified
visible Add a product → Save behavior (the deterministic total changed from
USD 625.00 to USD 635.00), the Send RFQ action exposing Confirm Order and
Sent, and Confirm Order exposing Receive and Confirmed. The focused API test
covers Edit, Delete, stale line/order versions, locked-state rejection,
empty/not-found/transport states, permission boundaries, and the unchanged
canonical list totals.

Evidence is local only and deliberately uncommitted. The Core3 runtime was
the isolated worktree server at `http://localhost:3002` with backend
`http://localhost:3221`; Odoo was the authenticated personal server at
`http://localhost:8069`.

| Surface | Desktop 1440×900 | Mobile 390×844 |
| --- | --- | --- |
| Odoo P00007 RFQ | `/tmp/odoo-purchase-rfq-P00007-desktop-1440x900-20260911.png`<br>SHA-256 `383ba0a82dc80272dda605ea3159b8ade0b0065d93862a047fc377841390f381` | `/tmp/odoo-purchase-rfq-P00007-mobile-390x844-20260911.png`<br>SHA-256 `f12f8f51ab982c015859fadd518173953e1bde75a90665ab7c54aee2c021a272` |
| Core3 initial Draft | `/tmp/core3-purchase-order-lines-desktop-1440x900-final-20260911.png`<br>SHA-256 `e1d7aadda918cbebae33385194c48c156d25e64e2d89b75b7be74e44a080650d` | `/tmp/core3-purchase-order-lines-mobile-390x844-final-20260911.png`<br>SHA-256 `0af224cb4a3b9e9bf6debe059fd81f48cb7764b4710d5aa4c1bfa0c54786675a` |
| Core3 mobile Products tab scrolled into view | — | `/tmp/core3-purchase-order-lines-mobile-lines-390x844-20260911.png`<br>SHA-256 `5cf9860ff034f6101855f90b1d54edbcfe1017df6898476bfd532f3de6a6fe68` |
| Core3 confirmed state | `/tmp/core3-purchase-order-lines-confirmed-1440x900-20260911.png`<br>SHA-256 `e02037c52033e1f33f7fde88b4641481f50baf7cbbc297902c2668867ce1d9a2` | — |

Comparison and fixes: the Core3 desktop form now matches the reference's
vendor/order-detail hierarchy, Products and Other Information tabs, six
line-grid fields, row edit/delete affordances, Add a product control, and
right-aligned total. The deterministic two-line fixture is structurally
equivalent to Odoo's two-line RFQ and retains the page width at 1440px. The
Core3 mobile capture retains a 390px body width with no horizontal page
overflow; the scrolled Products capture shows the compact responsive grid and
total. Core3 intentionally keeps the existing Fluent shell while Odoo keeps
its purple shell. Odoo's mobile line cards expose more fields in the first
viewport, while Core3's shared grid places the dense columns below the
stacked form and clips them within the grid; this is a documented shared
LineItemGrid density follow-up, not a page-width overflow.

Residuals: this bounded slice does not yet add Odoo's section/note/Catalog
line types, chatter/activity panel, receipt/bill/approval actions, or Odoo's
mobile card-level field density. During exploratory browser replay, a
post-delete refresh could surface the intended stale-row notification
(`This purchase order changed or is no longer editable`) before a second
action; the API row-version guard is covered and safe, but the page refresh
coordination remains a follow-up. No screenshots are tracked in Git.

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
## Bill matching action — 2026-09-11

The next uncovered Purchase action is the Purchase Order stat action `purchase.order.action_bill_matching`, exposed in Odoo as `Bill Matching`. From Purchase > Orders > Purchase Orders > PO/2026/0006, the authenticated reference opens the `purchase.bill.line.match` list view at `/odoo/purchase/12/purchase.bill.line.match`. Odoo’s source contract is `addons/purchase/models/purchase_order.py::action_bill_matching` plus `views/purchase_bill_line_match_views.xml`: the list is selectable and contains Reference, Product Description, Quantity, Qty to invoice, Unit, Price, Billed, and Purchased; selection exposes `Match` for `account.group_account_invoice` and `Add to PO` for `purchase.group_purchase_user`.

Reference evidence was captured with `codex@core3.local` at 1440x900 and 390x844. Both viewports show six populated rows and zero page/request errors. Desktop: `/tmp/odoo-purchase-bill-matching-desktop-1440x900-20260911.png` (SHA-256 `10daf762d43e343b1992c55ebd69683ccef9acca61cad931532d6d9cb4061e3c`). Mobile: `/tmp/odoo-purchase-bill-matching-mobile-390x844-20260911.png` (SHA-256 `14c62744e30a7527ceb532838f7d38b44472419a414e50985cd234f9d0ec6e57`). Selection captures are also outside Git: desktop SHA-256 `8d7b5aef8e528b85b9700531576989b8b1a32a39cee2ee48b60a0b055efa6215`; mobile SHA-256 `eb7ea60de7c3790d1ce478cff9caba4e278a20c7ea01b58d3800638e84639bf7`.

Core3 implements the same action at `/purchase/bill-matching?id=po-demo-006`, joined by `page.id: purchase-bill-matching` between `pages/purchase-bill-matching.yaml` and `api/purchase-bill-matching.yaml`; it is deliberately not a standalone menu because Odoo exposes it from the Purchase Order stat button. Migration `20260911220000-021-purchase-bill-matching.yaml` creates deterministic Odoo-shaped purchase/bill fixtures, including six rows for `po-demo-006` with `$6,936.00` purchased total and realistic bill/refund rows. The API includes populated, empty, searchable, and transport-error contracts, summary totals, permission-bound `Match` (`accounting.write`) and `Add to PO` (`purchase.write`) actions, guarded match/add mutations, stale protections, and target-PO locked-state rejection. The Add to PO form transports selected IDs and adds selected bill lines to the target PO with total recalculation.

Shared declarative runtime support adds ListView footer totals, Odoo stat buttons without a synthetic numeric value, and selected-ID transport for `server_form`. Focused integration coverage is in `test/purchase_bill_matching.integration.test.ts`; it verifies page/API discovery, permissions, six-row/empty/search/summary reads, matching stale guards, adding bill lines, total updates, and locked target rejection. Odoo’s separate vendor-bill-side `action_purchase_matching` and the wizard’s down-payment branch remain follow-up actions outside this bounded slice.
Authenticated Core3 evidence was completed from the isolated worktree runtime as `admin@tms.local` / `admin123` on `http://localhost:3275`: the Purchase Order stat button navigated to `/purchase/bill-matching?id=po-demo-006`, and the direct action route rendered all six rows. Desktop capture `/tmp/core3-purchase-bill-matching-desktop-1440x900-20260911.png` is 1440x900, SHA-256 `66d85fc00ae1a1605dbc43f65d0cb0fbdcd7e8b5358ca5628365fd095a832a67`; mobile capture `/tmp/core3-purchase-bill-matching-mobile-390x844-20260911.png` is 390x844, SHA-256 `c05c209ce0da9fdea608e6a20a8ad92746f838cbee2b7b382f0da6cd259929ac`. Both captures reported `body.scrollWidth` and `document.documentElement.scrollWidth` equal to the viewport width, with zero `requestfailed` and zero `pageerror` entries. The selected-row flow also exposed `Add to PO` and its Odoo-shaped form (`Purchase Order`, `Add Products`). Runtime startup initially failed because `accounting.write` was absent from the Purchase permission catalog; declaring that existing cross-module permission fixed startup and is included in the implementation follow-up commit.
## Receipt stat action — 2026-09-11

The selected uncovered Purchase action is the Purchase Order stat action
`action_view_picking`, shown as `Receipt` on Odoo order `P00012`. The live
authenticated audit used database `core3_user_demo` at
`http://127.0.0.1:8069`. Purchase > Orders > Purchase Orders remains the
owning menu; `Receipt` is not a new menu item. On the order form, Odoo shows a
count of `1` and opens the single linked receipt directly at
`/odoo/stock.picking/18` (`WH/IN/00006`) with Odoo's
`stock.view_picking_form`. The source behavior is
`addons/purchase_stock/models/purchase_order.py::action_view_picking` and
`addons/purchase_stock/views/purchase_views.xml`: a single picking receives
the form action and `res_id`, while the multi-picking case uses the receipt
list action.

The reference form contract is `Validate`, `Print`, `Return`, and `Cancel`
header actions; Draft/Ready/Done status; `Moves` count; Receive From, Operation
Type, Scheduled Date, Deadline, Source Document, Operations/Additional Info/
Note tabs; two receipt lines; and the OdooBot creation chatter. The deterministic
fixture mirrors this as `purchase-receipt-p00012`, `WH/IN/00006`, vendor
`Ready Mat`, operation type `YourCompany: Receipts`, source `P00012`, Ready
state, and the two Odoo-shaped lines `[FURN_6667] Acoustic Bloc Screens
(Black)` (20) and `[FURN_9001] Flipover` (10).

Reference captures, authenticated against the live Odoo instance, are local
and not tracked in Git:

| Surface | Desktop 1440×900 | Mobile 390×844 |
| --- | --- | --- |
| Odoo receipt form | `/tmp/odoo-purchase-receipt-form-desktop.png`<br>SHA-256 `29aa79104ee78d0de4afd8e09e44c4be0d169b1463666f4411a8676b18f1fc94` | `/tmp/odoo-purchase-receipt-mobile-20260911.png`<br>SHA-256 `9c20e6f3ea369ed8e970287834af74dcc223b98be106edf9040dbd8db1043b7f` |
| Core3 receipt detail | `/tmp/core3-purchase-receipt-desktop-final-20260911.png`<br>SHA-256 `c528e8eab421c4bf02fc7c33068d6a08ddca4cc45dd16e6add1cfcb385e28b19` | `/tmp/core3-purchase-receipt-mobile-final-20260911.png`<br>SHA-256 `2b42fe7e610c789efe3ede614ed1dcf4273c1dfec0f23a217de2aa392a52d9f1` |

Core3 implements the action-only route `/purchase/receipt?id=purchase-receipt-p00012`.
The layout contract is `pages/purchase-receipt.yaml`, and the API/action
contract is `api/purchase-receipt.yaml`; both join on
`page.id: purchase-receipt`, keeping page and API `page.id` concerns separate.
The Purchase Order page/API remain `purchase-detail` and expose the `Receipt`
stat only when a linked receipt exists and the order is Confirmed or Received.
The action transports the receipt ID and navigates to the direct detail route,
matching Odoo's single-picking behavior. Migration
`20260911230000-022-purchase-receipt.yaml` owns the receipt, line, and chatter
tables and stable fixture data. Read access is `purchase.read`; Validate,
Cancel, message/note, and line create/update/delete require `purchase.write`.
The API includes empty/error states, not-found handling, stale row guards, and
locked-state rejection at the mutation boundary.

Authenticated Core3 browser replay used the isolated worktree runtime at
`http://localhost:3022` as `admin@tms.local` / `admin123`. At both viewports,
the Purchase Order `Receipt` stat was clicked and navigated to the exact route
above. Required receipt content was present, including `WH/IN/00006`, `Ready
Mat`, `YourCompany: Receipts`, `Validate`, `Moves`, both products, and
`Transfer created`. Desktop reported `innerWidth/body.scrollWidth/
document.scrollWidth = 1440/1440/1440`; mobile reported `390/390/390`.
Both runs had zero request failures and zero page errors.

Focused verification from `sdk/bun/sample`:

```text
14 pass
0 fail
148 expect() calls
bun run audit: 524 pages, 531 routes, 918 datasources; audit passed
git diff --check: pass
```

The bounded slice intentionally does not add Odoo's Print/Return controls or
a separate Moves destination. The Moves stat is represented on the receipt
detail, while broader receipt operations remain a follow-up. Core3 retains the
shared Fluent shell. On mobile, the shared dense LineItemGrid is narrower than
Odoo's card presentation and its quantity columns are visually clipped inside
the grid; the page itself has no horizontal overflow. Screenshots remain in
`/tmp` only and no image files are committed.

## Merge RFQs list action — 2026-09-12

The next disjoint source-defined Purchase action is `action_merger` (`Merge
RFQs`) in `addons/purchase/views/purchase_views.xml`. Odoo binds it to the
`purchase.order` list, exposes it from `Actions` after selecting records, and
gates it with `account.group_account_invoice`. The authenticated live
reference at `http://localhost:8073`, database
`core3_codex_demo_20260912`, showed the exact sequence `Actions → Merge RFQs`
for two selected RFQs. Odoo accepts RFQs in `draft` or `sent` state, groups by
vendor/currency/destination, keeps the oldest RFQ, moves/combines its lines,
and cancels the other RFQs. The desktop reference had zero failed requests and
zero page errors; captures are local only under
`/tmp/core3-odoo-parity/purchase-next-20260912/`.

Core3 adds `Merge RFQs` as a selectable bulk action on the existing Requests
for Quotation page. The page/API pair remains joined by `page.id:
purchase-rfqs`; `api/purchase-rfqs.yaml` owns the `purchase.rfqs.merge`
mutation, with `accounting.write` permission, same-vendor/unlocked/open-RFQ
guards, deterministic oldest-survivor selection, line quantity/total
recalculation, reference aggregation, duplicate cancellation, stale-row
protection, and list refresh. Migration
`20260912100000-023-purchase-rfq-merge.yaml` adds the stable same-vendor
`PO/2026/0009` RFQ and its line fixture without changing other modules.

The focused Purchase integration test covers action/label/permission
declarations, deterministic fixture ordering, successful merge output,
duplicate cancellation, line-independent totals, invalid state/vendor
selection, and page/API binding. Odoo's mobile reference switches to Kanban
and does not expose selection checkboxes or the list `Actions` menu at 390px;
that responsive limitation is recorded as unavailable mobile action evidence,
not replaced with an invented flow. Core3 authenticated captures for this
slice remain pending if the isolated worktree runtime cannot bind a free
backend/frontend pair; no screenshot is claimed in that case.

## Bounded slice: Merge RFQs (2026-09-12)

The Odoo Purchase RFQ list exposes the manager-only `Merge` action for two or
more unlocked requests from the same vendor. Core3 keeps the existing RFQ
page/API pair and adds `merge_purchase_rfqs` with the same-vendor, unlocked,
minimum-selection, row-version, and permission guards. The oldest selected
RFQ remains the survivor; quantities and totals are combined and the other
selected records become cancelled.

The implementation adds deterministic migration `0.0.23` and focused coverage
inside `test/purchase.integration.test.ts`. The targeted merge test passes
with 7 assertions. The broader existing Purchase suite currently has two
unrelated 5-second fixture-query timeouts under the shared multi-runtime host;
those are not claimed as green. No fresh Core3/Odoo screenshot is claimed for
this slice and no image is committed.
