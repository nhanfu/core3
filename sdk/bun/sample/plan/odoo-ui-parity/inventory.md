# Inventory UI parity

Status: ready

## Reference gate

- Odoo addon: `stock` (Inventory), Odoo 19 Community source tree at
  `/home/nhanjs/projects/odoo`, branch `19.0`, source revision `65975996`.
- Source manifest: `/home/nhanjs/projects/odoo/addons/stock/__manifest__.py`.
  The addon is an application, depends on `product`,
  `barcodes_gs1_nomenclature`, and `digest`, and declares official demo files
  `stock_demo_pre.xml`, `stock_demo.xml`, `stock_demo2.xml`,
  `stock_orderpoint_demo.xml`, and `stock_storage_category_demo.xml`.
- Authenticated live audit on 2026-09-10: `http://localhost:8069`, database
  `core3_reference`, user `codex@core3.local`. `ir.module.module` reports `stock` as
  `installed`, `demo: true`, `latest_version: 19.0.1.1`; server version is
  `19.0-20260908`. The live database is therefore an installed, official-demo
  reference, not an unavailable/uninstalled fallback.
- The authenticated audit loaded the Inventory overview and every visible
  menu destination below with zero failed network requests. Do not replace
  these references with fabricated or unverified screenshots.

## Live screenshot evidence

Screenshots are outside Git under `/tmp/odoo-inventory/`. Desktop is 1440x900;
mobile is 390x844 with touch emulation. Each route was loaded after login and
the page title/body and failed-request list were checked before capture.

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Inventory Overview | `/tmp/odoo-inventory/overview-desktop.png` | `/tmp/odoo-inventory/overview-mobile.png` |
| Receipts | `/tmp/odoo-inventory/receipts-desktop.png` | `/tmp/odoo-inventory/receipts-mobile.png` |
| Deliveries | `/tmp/odoo-inventory/deliveries-desktop.png` | `/tmp/odoo-inventory/deliveries-mobile.png` |
| Physical Inventory | `/tmp/odoo-inventory/physical-inventory-desktop.png` | `/tmp/odoo-inventory/physical-inventory-mobile.png` |
| Scrap Orders | `/tmp/odoo-inventory/scrap-desktop.png` | `/tmp/odoo-inventory/scrap-mobile.png` |
| Replenishment | `/tmp/odoo-inventory/replenishment-desktop.png` | `/tmp/odoo-inventory/replenishment-mobile.png` |
| Products | `/tmp/odoo-inventory/products-desktop.png` | `/tmp/odoo-inventory/products-mobile.png` |
| Product Variants | `/tmp/odoo-inventory/product-variants-desktop.png` | `/tmp/odoo-inventory/product-variants-mobile.png` |
| Lots / Serial Numbers | `/tmp/odoo-inventory/lots-desktop.png` | `/tmp/odoo-inventory/lots-mobile.png` |
| Stock report | `/tmp/odoo-inventory/stock-report-desktop.png` | `/tmp/odoo-inventory/stock-report-mobile.png` |
| Moves History | `/tmp/odoo-inventory/moves-history-desktop.png` | `/tmp/odoo-inventory/moves-history-mobile.png` |
| Moves Analysis | `/tmp/odoo-inventory/moves-analysis-desktop.png` | `/tmp/odoo-inventory/moves-analysis-mobile.png` |
| Settings | `/tmp/odoo-inventory/settings-desktop.png` | `/tmp/odoo-inventory/settings-mobile.png` |
| Warehouses | `/tmp/odoo-inventory/warehouses-desktop.png` | `/tmp/odoo-inventory/warehouses-mobile.png` |
| Operations Types | `/tmp/odoo-inventory/operation-types-desktop.png` | `/tmp/odoo-inventory/operation-types-mobile.png` |
| Categories | `/tmp/odoo-inventory/categories-desktop.png` | `/tmp/odoo-inventory/categories-mobile.png` |
| Attributes | `/tmp/odoo-inventory/attributes-desktop.png` | `/tmp/odoo-inventory/attributes-mobile.png` |

The mobile captures for menu destinations may include Odoo's `?view_type=kanban`
selection because the responsive client chooses kanban; that is an observed
state and must be covered, not normalized away.

## Visible menu and source action inventory

The following is the authenticated admin-visible Inventory navigation, joined
to source XML IDs and live client routes. Group-restricted entries must be
tested with the corresponding ordinary user, multi-location/tracking user,
and stock manager rather than assumed visible for every role.

| Menu group | Menu item | Source XML ID / action | Live route | Source view modes |
| --- | --- | --- | --- | --- |
| Overview | Overview | `stock.stock_picking_type_menu` / `stock_picking_type_action` | `/odoo/inventory` | `kanban,form` |
| Operations | Receipts | `stock.in_picking` / `action_picking_tree_incoming` | `/odoo/receipts` (live action alias was `/odoo/action-412`) | `list,kanban,form,calendar,activity` |
| Operations | Deliveries | `stock.out_picking` / `action_picking_tree_outgoing` | `/odoo/deliveries` (live action alias `/odoo/action-413`) | `list,kanban,form,calendar,activity` |
| Operations | Physical Inventory | `stock.menu_action_inventory_tree` / `action_view_inventory_tree` | `/odoo/physical-inventory` | editable `list,form` plus adjustment wizard |
| Operations | Scrap | `stock.menu_stock_scrap` / `action_stock_scrap` | `/odoo/scraps` | `list,form,kanban,pivot,graph` |
| Operations | Replenishment | `stock.menu_reordering_rules_replenish` / `action_orderpoint_replenish` | `/odoo/replenishment` | `list,kanban,form` |
| Products | Products | `stock.menu_product_variant_config_stock` / `product_template_action_product` | `/odoo/action-433` | `kanban,list,form` |
| Products | Product Variants | `stock.product_product_menu` / `stock_product_normal_action` | `/odoo/action-434` | `list,form,kanban` |
| Products | Lots / Serial Numbers | `stock.menu_action_production_lot_form` / `action_production_lot_form` | `/odoo/lots` | list/form, grouped by location |
| Reporting | Stock | `stock.menu_product_stock` / `action_product_stock_view` | `/odoo/stock-report` | `list,form` plus Inventory at Date |
| Reporting | Moves History | `stock.stock_move_line_menu` / `stock_move_line_action` | `/odoo/moves-history` | `list,kanban,pivot,form` |
| Reporting | Moves Analysis | `stock.stock_move_menu` / `stock_move_action` | `/odoo/moves-analysis` | list/pivot/graph/kanban/form action views |
| Configuration | Settings | `stock.menu_stock_general_settings` / `action_stock_config_settings` | `/odoo/action-445` | `form` |
| Configuration | Warehouses | `stock.menu_action_warehouse_form` / `action_warehouse_form` | `/odoo/action-397` | list/form |
| Configuration | Operations Types | `stock.menu_pickingtype` / `action_picking_type_list` | `/odoo/action-426` | `list,form` |
| Configuration > Products | Categories | `stock.menu_product_category_config_stock` / `product.product_category_action_form` | `/odoo/product-categories` | list/form/kanban from product addon |
| Configuration > Products | Attributes | `stock.menu_attribute_action` / `product.attribute_action` | `/odoo/attributes` | list/form from product addon |

Source menus also define or expose these linked, role/feature-gated actions:
Transfers (all, internal), Adjustments (Physical Inventory, Scrap),
Procurement (Replenishment, Reordering Rules), warehouse management (Locations,
Operations Types, Routes, Putaway Rules, Storage Categories, Package Types),
Products (Stock, Product Variants, Units & Packagings, Categories, Attributes,
Packages, Lots), and reporting (Inventory/Stock, Moves History, Moves
Analysis). Preserve the distinction between visible menu entries and linked
stat buttons/wizards. Hidden technical barcode nomenclature is
`base.group_no_one` and is not an ordinary-user parity target.

## View, record, and interaction states

- Overview: kanban operation cards, Receipts/Deliveries/PoS order counters,
  late/waiting/ready cards, company switcher, pager, activity indicators, and
  empty/loading/error states.
- Transfers: Receipts, Deliveries, Internal Transfers, All Transfers, To Do,
  Waiting, Late, Backorders, Ready Moves, and Operations; list, kanban, form,
  calendar, and activity states; create/edit/read-only; draft, waiting,
  assigned, done, cancelled, backorder, lock/unlock, reserve/unreserve,
  validate, return, scrap, put in pack, labels, send email, and chatter.
- Inventory: editable on-hand list, set quantity, set zero, relocate,
  inventory adjustment name/conflict/warning dialogs, Inventory at Date, and
  product/location drilldowns.
- Products and stock: product kanban/list/form, variants, categories,
  attributes, packaging, lots/serials, packages, forecasted report, and
  replenish dialog, including archived, tracked, storable, multi-company,
  no-result, access-denied, and empty states.
- Replenishment: reordering rules and replenishment list/kanban/form, trigger
  filters (automatic/manual), snooze, forecast quantities, vendor/orderpoint
  fields, and replenishment information/warning dialogs.
- Scrap: list/kanban/form/pivot/graph, create/edit, source/destination
  locations, product/lot/package, quantity validation, confirm/done/cancelled,
  and insufficient-quantity warning.
- Reporting: stock list with category/product filters and Inventory at Date;
  Moves History done filter with list/kanban/pivot/form; Moves Analysis with
  list/pivot/graph/kanban and group-by/measure states; traceability and PDF
  report error/download states.
- Settings: system settings form with inventory operation, warehouse,
  barcode, lots/serials, packages, routes, lead times, warnings, and optional
  module controls; full-width Odoo settings layout.
- Common controls: search, filters, group-by, optional columns, bulk actions,
  pagination, row open, breadcrumbs, action menus, status chips, many2one and
  one2many fields, date/context filters, company scope, access-denied,
  loading, server error, and no-data states. Mobile must use usable menus and
  forms with no horizontal page overflow.

## Existing Core3 surface and parity gap

The `services/inventory` service currently contains `manifest.yaml`, storage and
permissions, two migrations, `styles/index.scss`, and these convention-
discovered pages:

- `stock` (`/stock`): On Hand `ListView` over `inventory_quants`;
- `moves` (`/moves`): Stock Moves list, state filter, create/validate/cancel
  mutations, and stock summary;
- `warehouses` (`/warehouses`): warehouse list and manager-only create;
- `locations` (`/locations`): location list and manager-only create; and
- `inventory-analysis` (`/inventory-analysis`): four stats and units-by-
  location bar chart.

The foundation schema only models warehouses, locations, quants, and simple
moves, with one pallet demo quant. It lacks pickings/operation types, move
lines, products/variants/UoM, lots/serials, packages, reservations, orderpoints,
routes/rules, scrap, valuation, replenishment, companies, activities/chatter,
settings, attachments, reports, linked dialogs, and the Odoo workflow/role
boundaries. Page YAML currently owns SQL; new backend datasource/action
definitions should move to convention-discovered `services/inventory/api/`
fragments keyed by `page.id`, while frontend page YAML remains declarative.

## Required shared primitives

Reuse and extend generic contracts before adding Inventory-specific code:

- Odoo `ListView`, `Kanban`, `FormView`/`OdooFormView`, `Calendar`, `Activity`,
  `Pivot`, `Chart`, `StatRow`, `StatusBar`, `StatusChip`, pager, optional
  columns, bulk selection, search/filter/group-by, and responsive card/list
  modes;
- server-form/action mutation contracts with guards, optimistic refresh,
  stable errors, permission-aware buttons, async many2one/one2many fields,
  dialogs/modals, date/context filters, company switcher, and attachment/
  chatter/activity panels;
- inventory-generic quantity editor, reservation/availability indicator,
  lot/serial selector, package/location selector, barcode input, forecast
  panel, replenishment warning, return/backorder, scrap, put-in-pack, physical
  inventory adjustment, and PDF/report result contracts. If absent, add the
  generic primitive/API contract to the implementation plan first; do not
  create a page-specific renderer;
- `SettingsView` with Odoo full-width layout and content-only scrolling;
  shared i18n, loading, empty, error, access-denied, responsive overflow, and
  mobile action-menu primitives.

## Deterministic service-owned datasource/API contract

All pages and view states must use service-owned datasource/API fragments. No
page-local records, random IDs, `CURRENT_DATE`, browser fixtures, remote images,
or live Odoo calls are allowed. Add idempotent migrations and prove fresh
install plus upgrade behavior for DuckDB and supported adapters.

The fixture provider must include stable IDs and seeded date `2026-01-15`, with:

- at least one company and warehouse, multiple active/archived locations,
  internal/customer/supplier/transit/loss usages, and ordinary, manager,
  multi-location, lot-tracking, and denied users;
- storable goods and consumables, variants, UoMs, categories, packages,
  lots/serials, products with zero/on-hand/reserved/forecast quantities,
  negative/insufficient and multi-company cases;
- receipts, deliveries, internal transfers, draft/waiting/assigned/done/
  cancelled/backorder pickings, move lines, operations, packages, returns,
  scraps, inventory adjustments, and chatter/activity records;
- automatic/manual orderpoints, routes, push/pull rules, vendors, lead times,
  snoozed and warning replenishment cases; and
- stable datasets for every named filter/group/measure, a deliberately empty
  result for every list and analysis route, deterministic pagination/order, and
  explicit 401/403/404/409/422 responses for read, write, manager, tracking,
  settings, and report permissions.

Mutation APIs must cover create/edit, reserve/unreserve, validate/cancel,
backorder/return, set quantity/zero, relocate, scrap, put in pack, replenish,
snooze, lot assignment, and settings updates. Guards must enforce source and
destination differences, available stock, tracked-lot requirements, state
transitions, company scope, row versions, and stable conflict messages.

## Source-defined routes

Odoo web-client action routes are generated aliases, not Python HTTP endpoints;
the observed authenticated paths are listed in the menu table. The stock addon
also defines the authenticated controller route
`/stock/<output_format>/<report_name>` in
`addons/stock/controllers/main.py`, currently used for PDF traceability with
`active_id`, `active_model`, `data`, and optional JSON context. Core3 must model
the report request as a permission-checked service action and must not expose a
raw arbitrary report path. Preserve explicit Core3 routes `/stock`, `/moves`,
`/warehouses`, `/locations`, and `/inventory-analysis`, adding aliases only for
compatibility; add explicit routes for the parity surfaces above.

## Bounded batch: receipts and deliveries transfers (2026-09-10)

This batch implements the next bounded transfer slice only. It follows the
Odoo 19 `action_picking_tree_incoming` and `action_picking_tree_outgoing`
orders: `list`, `kanban`, `form`, `calendar`, `activity`, with Receipts before
Deliveries under the Transfers menu group. Core3 keeps its existing route
aliases (`/receipts`, `/deliveries`, and `/inventory/transfer/detail`) because
the shell qualifies service routes; the visible labels and breadcrumb order
match the Odoo action/menu labels. The Inventory overview remains the existing
`/stock` alias and is not claimed as complete in this batch.

The list pages are layout-only YAML. `pages/receipts.yaml` and
`pages/deliveries.yaml` bind to `api/transfers.yaml` and
`api/deliveries.yaml`; the shared detail layout is `pages/transfer-detail.yaml`
with page id `transfer-detail`, owned by `api/transfer-detail.yaml`. That
page-id alignment fixes side-panel requests that previously addressed the
filename `transfer-detail` while the API page id was `inventory-transfer-detail`.

The `0.0.4` Inventory migration adds stable move-line and transfer-history
fixtures for receipts and deliveries. List and detail sources expose
deterministic empty/not-found predicates and `503`
`INVENTORY_TRANSFER_DATA_UNAVAILABLE` transport states. Detail actions enforce
`inventory.write`, row-version guards, and the Odoo-style Draft → Waiting →
Ready → Done / Cancelled transitions. The detail includes Operations,
Additional Info, Note, move lines, Send message, and Log note. Move-line CRUD,
lot/package/reservation details, Print, Return, and the mobile action menu are
intentionally deferred rather than represented by placeholder controls.

Focused evidence:

- `bun test test/inventory_transfer_workflow.integration.test.ts`: 3 tests,
  41 assertions passed; `git diff --check` passed.
- Authenticated Core3 desktop captures (1440x900):
  `/tmp/core3-inventory-batch-desktop-receipts-list-final.png`,
  `/tmp/core3-inventory-batch-desktop-receipts-detail-final.png`.
- Authenticated Core3 mobile captures (390x844):
  `/tmp/core3-inventory-batch-mobile-deliveries-list-final.png`,
  `/tmp/core3-inventory-batch-mobile-deliveries-detail-final.png`.
- Authenticated personal Odoo 19 comparison captures:
  `/tmp/odoo-inventory-batch-desktop-receipts-list.png`,
  `/tmp/odoo-inventory-batch-desktop-receipts-detail.png`,
  `/tmp/odoo-inventory-batch-desktop-deliveries-detail.png`,
  `/tmp/odoo-inventory-batch-mobile-deliveries-list.png`.
- Core3 browser checks used `admin@tms.local` on the isolated runtime at
  `http://127.0.0.1:3090`; the list/detail routes loaded with no responses at
  or above HTTP 400. The final mobile delivery list has
  `scrollWidth === clientWidth === 390`, after removing the grouped kanban
  overflow found during comparison. The reference session used
  `codex@core3.local` in `core3_reference` at `http://127.0.0.1:8069`.

## Bounded batch: Physical Inventory (2026-09-10)

The authenticated `core3_owned` Odoo 19 reference was refreshed after the
installed-module restart before this batch. The exact observed module/action
state is:

- `stock` is `installed`, with demo data enabled, version `19.0.1.1`.
- XMLID `stock.action_view_inventory_tree` resolves to `ir.actions.server`
  id `519`, named `Inventory`, path `physical-inventory`, model `Quants`.
- XMLID `stock.menu_action_inventory_tree` resolves to `ir.ui.menu` id `331`.
- The action is list-only. Its visible action surface is `Physical Inventory`
  under Operations, with `New`, `Apply All`, row `History`, and the editable
  Product, Lot/Serial Number, Scheduled, User, On Hand, Counted, Difference,
  and Unit columns. Odoo's manager-only row actions `Set to 0` and `Clear`
  are permissioned as `inventory.manage` in Core3; `Set to On Hand`, `Apply`,
  and `Apply All` use `inventory.write`.
- No kanban, calendar, or other Physical Inventory view was exposed by this
  source action, so Core3 does not invent tabs for this list-only route. The
  existing shell's visible text menu labels and the list's visible filter
  labels are retained.

Core3 keeps the service-owned page/API split joined by `page.id`:
`pages/physical-inventory.yaml` (`physical-inventory`) binds to
`api/physical-inventory.yaml` (`physical-inventory`). Migration `0.0.5`
adds stable internal/transit physical-inventory quantities, lot values,
counted states, fixed `2026-01-15` dates, and deterministic ordering. The
route includes search, My Counts/location/count-state filters, grouping,
empty and transport-error states, create/apply-all dialogs, row-version
guards, and permission-aware row actions. The `Physical Inventory` manifest
menu requires `inventory.read`.

Focused evidence:

- `bun run --cwd packages/client test -- test/cases/list-view.test.ts
  test/cases/page-renderer-list-view.test.ts`: 44 tests passed, including
  permitted header-action rendering, single-instance protection, and server
  action dispatch; `bun test test/inventory_physical_inventory.integration.test.ts`:
  3 tests and 22 assertions passed.
- `bun run css:build:inventory`, `git diff --check`, and the Inventory audit
  passed. The authenticated Core3 runtime used `admin@tms.local` at
  `http://127.0.0.1:3090`; desktop and mobile both had no failed responses,
  one `Apply All` header action, one Physical Inventory menu leaf, and no
  duplicate header actions.
- Core3 desktop (1440x900):
  `/tmp/core3-inventory-next-physical-desktop.png`;
  Core3 mobile (390x844):
  `/tmp/core3-inventory-next-physical-mobile.png`. Both had document/body
  `scrollWidth === clientWidth` (1440/1440 and 390/390).
- Refreshed authenticated Odoo captures used `codex@core3.local` in
  `core3_owned` at `http://localhost:8069`. Desktop:
  `/tmp/odoo-inventory-next-owned-physical-desktop.png` with document/body
  1440/1440 and table 1440/1440. Mobile:
  `/tmp/odoo-inventory-next-owned-physical-mobile.png` with document/body
  390/390; the table is intentionally 888/390 and clipped inside
  `.o_list_renderer.table-responsive` with `overflow-x: auto`. No failed
  requests occurred after navigating to the ready list in either capture.

The list-only source action's absent tabs and deferred Odoo-side actions such
as Relocate, Request a Count, and report/export flows remain documented
limitations rather than invented routes or controls.

## Bounded batch: Lots / Serial Numbers (2026-09-10)

The owned `core3_owned` Odoo 19 reference was authenticated as
`codex@core3.local` at `http://localhost:8069` before finalizing this slice.
The source action is `stock.action_production_lot_form` at `/odoo/lots`, with
list, kanban, and form views, default grouping by location, and search/filter
contracts for lot/reference/product, At Customer, and On Hand.

Core3 adds the `/inventory/lots` and `/inventory/lots/detail` routes. The
presentation-only pages are `pages/lots.yaml` (`lots`) and
`pages/lot-detail.yaml` (`lot-detail`), bound by `page.id` to
`api/lots.yaml` and `api/lot-detail.yaml`. Migration `0.0.8` adds the
service-owned `inventory_lots` table and stable lot/serial fixtures dated
`2026-01-15`, including on-hand, customer, empty, serial, and moved-product
cases. List/detail sources provide deterministic search, availability filters,
empty/not-found results, and explicit 503 transport errors. Manage actions
enforce duplicate, quantity, location, moved-product, safe-delete, and row
version guards.

Focused evidence:

- `bun test test/inventory_lots.integration.test.ts`: 3 tests, 46 assertions passed.
- `git diff --check`: passed before commit.
- Odoo authenticated JSON-RPC evidence: `/tmp/core3-owned-auth.json`,
  `/tmp/core3-owned-lot-fields.json`, and `/tmp/core3-owned-lot-data.json`.
- Fresh authenticated paired list captures were completed at 1440x900 and
  390x844: Core3 `/tmp/core3-inventory-lots-desktop.png` and
  `/tmp/core3-inventory-lots-mobile.png`, Odoo
  `/tmp/odoo-inventory-lots-odoo-desktop.png` and
  `/tmp/odoo-inventory-lots-odoo-mobile.png`. Both surfaces reported zero
  failed responses and equal document/body widths to their viewport. Visual
  comparison found Core3 was opening the first record in a desktop side
  panel; `form_view.side_panel` is now false so the initial list matches
  Odoo, with row selection still opening the detail route. Screenshots remain
  under `/tmp` and are not included in Git.

Known limitations are unchanged from this bounded action: product and partner
relations are deterministic text contracts, and traceability/report,
activities/chatter, properties, and full Odoo many2one behavior remain future
parity work.

## Acceptance

- The implementation maps every admin-visible menu/action in the table to a
  Core3 route or a documented deliberate redirect. It separately documents
  role/feature-gated linked actions and keeps the technical barcode menu hidden.
- Authenticated Playwright navigation starts from the Core3 Inventory menu and
  covers every Core3 route at 1440x900 and 390x844, including the observed
  mobile kanban query state; direct URL checks alone do not sign off navigation.
- Reference comparison uses the captured `/tmp/odoo-inventory/*` files above;
  new captures are required if the live addon, database, user role, or source
  version changes. Assert titles, visible menus/records, no failed requests,
  no horizontal overflow, and usable mobile forms/actions.
- Functional checks cover every list/form/kanban/calendar/activity/pivot/graph/
  settings state, search/filter/group-by/optional columns/bulk/pagination/row
  open, empty/loading/error/denied states, dialogs, reports, and linked
  drilldowns. Assert the visible field/action contract against source XML.
- Workflow checks cover receipt/delivery/internal state transitions, reserve,
  validate, cancel, backorder, return, scrap, put in pack, adjustment,
  relocation, replenishment, lot/serial rules, and permission/company/row-
  version boundaries.
- Datasource checks prove service ownership, stable seeded ordering and IDs,
  deterministic totals, no page-local hard-coded records or remote assets,
  idempotent migration/upgrade, and every documented error response.
- Run focused YAML parsing/schema checks for all inventory YAML, markdown link
  and table checks for this file, the relevant Core3 audit/tests, authenticated
  browser smoke, and `git diff --check`. Screenshots remain under `/tmp`; the
  implementation commit may contain only YAML/TS/docs needed for the batch.
