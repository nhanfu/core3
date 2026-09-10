# Purchase UI parity — sub-plan

Status: `in-progress`

## Reference gate and evidence

- Odoo addon/version: `purchase`, Odoo 19 Community source checkout at
  `/home/nhanjs/projects/odoo/addons/purchase`.
- Source manifest: `/home/nhanjs/projects/odoo/addons/purchase/__manifest__.py`.
  It depends on `account`, is an application, and declares official demo data
  in `data/purchase_demo.xml`.
- Authenticated live reference checked on 2026-09-10 at
  `http://localhost:8069`, database `core3_reference`, server version
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
| Configuration | `Settings` (`/odoo/action-704`), `Vendor Pricelists` (`/odoo/action-239`), `Attributes` (`/odoo/attributes`), `Categories` (`/odoo/product-categories`) |

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
confirmation date/month, vendor, product, state, ordered/received quantities,
and untaxed total. The layout uses visible `Graph`, `Pivot`, and `List` tabs,
with a line graph defaulting to confirmation date and a pivot defaulting to
confirmation month by state, matching the installed Odoo action 645.

Authenticated reference captures are `/tmp/odoo-purchase-analysis-action-645-
{desktop,mobile}.png`; Core3 before/after captures are kept under `/tmp` and
are never committed. The initial comparison found the previous Core3 stat-card
dashboard materially differed from Odoo's graph report; the replacement keeps
the Odoo report controls and provides a deterministic empty state. Focused
contract tests live in `test/purchase_analysis.integration.test.ts`.

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
- Because the current live addon is uninstalled, installed-reference capture
  and final visual sign-off remain a required follow-up prerequisite. The
  fallback screenshots above must remain labeled as Discuss/uninstalled and
  must never be presented as Purchase parity evidence.

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
